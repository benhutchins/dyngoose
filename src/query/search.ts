import { DynamoDB } from 'aws-sdk'
import { get, has, includes, isArray } from 'lodash'
import { Attribute } from '../attribute'
import { QueryError } from '../errors'
import { Metadata } from '../index'
import { ITable, Table } from '../table'
import { Condition } from './condition'
import { buildQueryExpression, keyConditionAllowedOperators } from './expression'
import { AttributeNames, ComplexFilters, Filter, Filters } from './filters'
import { GlobalSecondaryIndex } from './global-secondary-index'
import { LocalSecondaryIndex } from './local-secondary-index'
import { Results as QueryResults } from './results'

export interface MagicSearchInput<T extends Table> {
  /**
   * Tell the search to page internally and return all possible search results.
   *
   * Be cautious. This can easily cause timeouts if you're using Lambda functions.
   * This is also non-ideal for scans, for better performance use a segmented scan
   * via the Query.PrimaryKey.segmentedScan or Query.GlobalSecondaryIndex.segmentedScan.
   *
   * Defaults to `false`.
   */
  all?: boolean

  limit?: number
  exclusiveStartKey?: DynamoDB.Key
  projectionExpression?: DynamoDB.ProjectionExpression
  rangeOrder?: 'ASC' | 'DESC'
  consistent?: DynamoDB.ConsistentRead
  returnOnlyCount?: boolean

  /**
   * Perform your query on the specified index, which can be a GSI object or a string
   */
  index?: GlobalSecondaryIndex<T> | LocalSecondaryIndex<T> | string

  /**
   * @deprecated use MagicSearchInput<T>.index
   */
  indexName?: string
}

export type SearchGroupFunction<T extends Table> = (condition: MagicSearch<T>) => any

/**
 * Use this via Table.search()
 */
export class MagicSearch<T extends Table> {
  private filters: ComplexFilters<T> = []

  constructor(private tableClass: ITable<T>, filters?: Filters<T>, private input: MagicSearchInput<T> = {}) {
    if (filters) {
      this.addFilterGroup([filters])
    }
  }

  addFilterGroup(filters: Filters<T>[]) {
    this.filters = this.filters.concat(filters)
  }

  /**
   * This will execute the query you constructed.
   *
   * A promise will be returned that will resolve to the results array upon completion.
   */
  async exec(): Promise<QueryResults<T>> {
    const input = this.getInput()
    return this.page(input)
  }

  parenthesis(value: SearchGroupFunction<T>) {
    return this.group(value)
  }

  group(value: SearchGroupFunction<T>): MagicSearch<T> {
    const groupedSearch = new MagicSearch<T>(this.tableClass)
    value(groupedSearch)
    this.filters.push(groupedSearch.filters)
    return this
  }

  filter<Attr extends AttributeNames<T>>(attr: Attr) {
    return new Condition<T, Attr, T[Attr]>(this, attr)
  }

  where<Attr extends AttributeNames<T>>(attr: Attr) {
    return new Condition<T, Attr, T[Attr]>(this, attr)
  }

  attribute<Attr extends AttributeNames<T>>(attr: Attr) {
    return new Condition<T, Attr, T[Attr]>(this, attr)
  }

  or(): MagicSearch<T> {
    this.filters.push('OR')
    return this
  }

  and(): MagicSearch<T> {
    return this
  }

  // and(filters: FilterAssociationMap<T>): MagicSearch<T> {
  //   if (isArray(filters)) {
  //     this.filters.push(filters)
  //   } else {
  //     this.filters.push([filters])
  //   }

  //   return this
  // }

  // or(filters: FilterAssociationMap<T>): MagicSearch<T> {
  //   if (this.filters.length === 0) {
  //     throw new Error('Cannot perform a .or operation before starting a query')
  //   }

  //   (this.filters[this.filters.length - 1] as any).push(filters)
  //   return this
  // }

  /**
   * This function will limit the number of documents that DynamoDB will process in this query request.
   *
   * Unlike most SQL databases this does not guarantee the response will contain 5 documents.
   * Instead DynamoDB will only query a maximum of 5 documents to see if they match and should be returned.
   * The limit parameter passed in should be a number representing how many documents you wish DynamoDB to process.
   */
  limit(limit: number): MagicSearch<T> {
    this.input.limit = limit
    return this
  }

  /**
   * When there are more documents available to your query than DynamoDB can return,
   * Dyngoose will let you know by specifying Results.lastEvaluatedKey.
   *
   * You can pass that object into this method to get additional results from your table.
   */
  startAt(exclusiveStartKey?: DynamoDB.Key): MagicSearch<T> {
    this.input.exclusiveStartKey = exclusiveStartKey
    return this
  }

  /**
   * This function will limit which attributes DynamoDB returns for each item in the table.
   *
   * This can limit the size of the DynamoDB response and helps you only retrieve the data you need.
   * Simply provide an array of strings representing the property names you wish DynamoDB to return.
   *
   * @TODO this is not yet implemented
   */
  // attributes(attributes: string[]): MagicSearch<T> {
  //   this.input.projectionExpression = attributes.join(', ')
  //   return this
  // }

  /**
   * Instead of returning the records, this function will cause the query operation to return only the count of possible results.
   */
  count() {
    this.input.returnOnlyCount = true
    return this
  }

  /**
   * This will cause the query to run in a consistent manner as opposed to the default eventually consistent manner.
   */
  consistent(consistent: DynamoDB.ConsistentRead = true): MagicSearch<T> {
    this.input.consistent = consistent
    return this
  }

  /**
   * This causes the query to be run on a specific index as opposed to the default table wide query.
   * The index parameter you pass in should represent the name of the index you wish to query on.
   */
  using(index: GlobalSecondaryIndex<T> | LocalSecondaryIndex<T> | string | null): MagicSearch<T> {
    if (index === null) {
      this.input.index = undefined
      this.input.indexName = undefined
    } else {
      this.input.index = index
    }

    return this
  }

  /**
   * This function sorts the documents you receive back by the rangeKey. By default, if not provided, it will sort in ascending order.
   *
   * The order parameter must be a string either equal to ascending or descending.
  */
  sort(direction: 'ascending' | 'descending'): MagicSearch<T> {
    if (direction === 'ascending') {
      this.input.rangeOrder = 'ASC'
    } else if (direction === 'descending') {
      this.input.rangeOrder = 'DESC'
    }

    return this
  }

  async all() {
    const input = this.getInput()

    const result: QueryResults<T> = {
      records: [],
      count: 0,
      scannedCount: 0,
      consumedCapacity: null as any,
    }

    let page: QueryResults<T> | void

    // if this is the first page, or if we have not hit the last page, continue loading records…
    while (!page || page.lastEvaluatedKey) {
      if (page && page.lastEvaluatedKey) {
        input.ExclusiveStartKey = page.lastEvaluatedKey
      }

      page = await this.page(input)

      // append the query results
      result.records = result.records.concat(page.records)
      result.count = result.count + page.count
      result.scannedCount = result.count + page.scannedCount
      // page.consumedCapacity TODO
    }

    return result
  }

  getInput(): DynamoDB.ScanInput | DynamoDB.QueryInput {
    let indexMetadata: Metadata.Index.GlobalSecondaryIndex | Metadata.Index.PrimaryKey | undefined

    if (this.input.index && typeof this.input.index !== 'string') {
      this.input.indexName = this.input.index.metadata.name
    }

    if (this.input.indexName) {
      // if we were given an index, find the metadata object for it
      for (const index of this.tableClass.schema.globalSecondaryIndexes) {
        if (index.name === this.input.indexName) {
          indexMetadata = index
        }
      }

      if (!indexMetadata) {
        for (const index of this.tableClass.schema.localSecondaryIndexes) {
          if (index.name === this.input.indexName) {
            indexMetadata = Object.assign({
              hash: this.tableClass.schema.primaryKey.hash,
            }, index) as Metadata.Index.GlobalSecondaryIndex
          }
        }
      }

      if (!indexMetadata) {
        throw new QueryError(`Attempted to perform ${this.tableClass.schema.name}.search using non-existent index ${this.input.indexName}`)
      }
    } else {
      // if no index was specified, look to see if there is an available index given the query
      indexMetadata = this.findAvailableIndex()

      if (has(indexMetadata, 'name')) {
        this.input.indexName = get(indexMetadata, 'name')
      }
    }

    const query = buildQueryExpression(this.tableClass.schema, this.filters, indexMetadata)

    const input: DynamoDB.ScanInput | DynamoDB.QueryInput = {
      TableName: this.tableClass.schema.name,
      ConsistentRead: false,
      ExpressionAttributeNames: query.ExpressionAttributeNames,
      ExpressionAttributeValues: query.ExpressionAttributeValues,
      FilterExpression: query.FilterExpression,
    }

    if (this.input.rangeOrder === 'DESC') {
      (input as any).ScanIndexForward = false
    }

    if (this.input.limit != null) {
      input.Limit = this.input.limit
    }

    if (this.input.exclusiveStartKey) {
      input.ExclusiveStartKey = this.input.exclusiveStartKey
    }

    if (this.input.consistent != null) {
      input.ConsistentRead = this.input.consistent
    }

    if (this.input.indexName) {
      input.IndexName = this.input.indexName
    }

    if (this.input.returnOnlyCount) {
      input.Select = 'COUNT'
    }

    if (query.KeyConditionExpression) {
      (input as DynamoDB.QueryInput).KeyConditionExpression = query.KeyConditionExpression
    }

    return input
  }

  /**
   * @deprecated Use MagicSearch.prototype.exec()
   */
  search(): Promise<QueryResults<T>> {
    return this.exec()
  }

  async page(input: DynamoDB.ScanInput | DynamoDB.QueryInput): Promise<QueryResults<T>> {
    let output: DynamoDB.ScanOutput | DynamoDB.QueryOutput

    // if we are filtering based on key conditions, run a query instead of a scan
    if ((input as DynamoDB.QueryInput).KeyConditionExpression) {
      output = await this.tableClass.schema.dynamo.query(input).promise()
    } else {
      if ((input as any).ScanIndexForward === false) {
        throw new Error('Cannot use specify a sort direction, range order, or use ScanIndexForward on a scan operation. Try specifying the index being used.')
      } else {
        delete (input as any).ScanIndexForward
      }

      output = await this.tableClass.schema.dynamo.scan(input).promise()
    }

    const records: T[] = (output.Items || []).map((item) => {
      return this.tableClass.fromDynamo(item)
    })

    const results: QueryResults<T> = {
      records,
      count: output.Count || records.length,
      scannedCount: output.ScannedCount as number,
      lastEvaluatedKey: output.LastEvaluatedKey,
      consumedCapacity: output.ConsumedCapacity as DynamoDB.ConsumedCapacity,
    }

    return results
  }

  private findAvailableIndex(): Metadata.Index.GlobalSecondaryIndex | Metadata.Index.PrimaryKey | undefined {
    // look at the primary key first
    const primaryKey = this.tableClass.schema.primaryKey
    if (this.checkFilters(primaryKey.hash, primaryKey.range)) {
      return primaryKey
    }

    // look through GlobalSecondaryIndexes
    for (const index of this.tableClass.schema.globalSecondaryIndexes) {
      // skip if it doesn't have a full projection
      if (index.projection === 'INCLUDE' || index.projection === 'KEYS_ONLY') {
        continue
      }

      // determine if we can use this index
      if (this.checkFilters(index.hash, index.range)) {
        return index
      }
    }

    // look through LocalSecondaryIndexes
    for (const index of this.tableClass.schema.localSecondaryIndexes) {
      // skip if it doesn't have a full projection
      if (index.projection === 'INCLUDE' || index.projection === 'KEYS_ONLY') {
        continue
      }

      // determine if we can use this index
      if (this.checkFilters(primaryKey.hash, index.range)) {
        const metadata: Metadata.Index.GlobalSecondaryIndex = Object.assign({
          hash: primaryKey.hash,
        }, index)
        return metadata
      }
    }
  }

  private checkFilters(hash: Attribute<any>, range?: Attribute<any>): boolean {
    // cannot filter by a key without a value for the hash key
    for (const filters of this.filters) {
      if (!has(filters, hash.name)) {
        continue
      }

      const hashFilter: Filter<any> = get(filters, hash.name) as any

      // if there is an operator, ensure it is allowed as a key expression
      if (isArray(hashFilter)) {
        const operator = hashFilter[0]

        if (!includes(keyConditionAllowedOperators, operator)) {
          continue
        }
      }

      // if it has no range, then we're all done
      if (!range) {
        return true
      }

      // check for the range now
      if (!has(filters, range.name)) {
        continue
      }

      const rangeFilter: Filter<any> = get(filters, range.name) as any

      // if there is an operator, ensure it is allowed as a key expression
      if (isArray(rangeFilter)) {
        const operator = rangeFilter[0]

        if (!includes(keyConditionAllowedOperators, operator)) {
          continue
        }
      }

      return true
    }

    return false
  }
}
