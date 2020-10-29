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
import { QueryOutput } from './output'

export interface MagicSearchInput<T extends Table> {
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

  constructor(private readonly tableClass: ITable<T>, filters?: Filters<T>, private input: MagicSearchInput<T> = {}) {
    if (filters != null) {
      this.addFilterGroup([filters])
    }
  }

  addFilterGroup(filters: Array<Filters<T>>): this {
    this.filters = this.filters.concat(filters)
    return this
  }

  /**
   * This will execute the query you constructed.
   *
   * A promise will be returned that will resolve to the results array upon completion.
   */
  async exec(): Promise<QueryOutput<T>> {
    const input = this.getInput()
    return await this.page(input)
  }

  parenthesis(value: SearchGroupFunction<T>): this {
    return this.group(value)
  }

  group(value: SearchGroupFunction<T>): this {
    const groupedSearch = new MagicSearch<T>(this.tableClass)
    value(groupedSearch)
    this.filters.push(groupedSearch.filters)
    return this
  }

  filter<Attr extends AttributeNames<T>>(attributePropertyName: Attr): Condition<T, Attr, T[Attr]> {
    return new Condition<T, Attr, T[Attr]>(this, attributePropertyName)
  }

  where<Attr extends AttributeNames<T>>(attributePropertyName: Attr): Condition<T, Attr, T[Attr]> {
    return new Condition<T, Attr, T[Attr]>(this, attributePropertyName)
  }

  attribute<Attr extends AttributeNames<T>>(attributePropertyName: Attr): Condition<T, Attr, T[Attr]> {
    return new Condition<T, Attr, T[Attr]>(this, attributePropertyName)
  }

  or(): this {
    this.filters.push('OR')
    return this
  }

  and(): this {
    return this
  }

  /**
   * This function will limit the number of documents that DynamoDB will process in this query request.
   *
   * Unlike most SQL databases this does not guarantee the response will contain 5 documents.
   * Instead DynamoDB will only query a maximum of 5 documents to see if they match and should be returned.
   * The limit parameter passed in should be a number representing how many documents you wish DynamoDB to process.
   */
  limit(limit: number): this {
    this.input.limit = limit
    return this
  }

  /**
   * When there are more documents available to your query than DynamoDB can return,
   * Dyngoose will let you know by specifying Results.lastEvaluatedKey.
   *
   * You can pass that object into this method to get additional results from your table.
   */
  startAt(exclusiveStartKey?: DynamoDB.Key): this {
    this.input.exclusiveStartKey = exclusiveStartKey
    return this
  }

  /**
   * This function will limit which attributes DynamoDB returns for each item in the table.
   *
   * This can limit the size of the DynamoDB response and helps you only retrieve the data you need.
   * Simply provide an array of strings representing the property names you wish DynamoDB to return.
   */
  attributes<Attr extends AttributeNames<T>>(...attributes: Attr[]): this {
    const attributeNames: string[] = []

    for (const propertyName of attributes) {
      const attr = this.tableClass.schema.getAttributeByPropertyName(propertyName as string)
      attributeNames.push(attr.name)
    }

    this.input.projectionExpression = attributeNames.join(',')
    return this
  }

  /**
   * Instead of returning the records, this function will cause the query operation to return only the count of possible results.
   */
  count(): this {
    this.input.returnOnlyCount = true
    return this
  }

  /**
   * This will cause the query to run in a consistent manner as opposed to the default eventually consistent manner.
   */
  consistent(consistent: DynamoDB.ConsistentRead = true): this {
    this.input.consistent = consistent
    return this
  }

  /**
   * This causes the query to be run on a specific index as opposed to the default table wide query.
   * The index parameter you pass in should represent the name of the index you wish to query on.
   */
  using(index: GlobalSecondaryIndex<T> | LocalSecondaryIndex<T> | string | null): this {
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
  sort(direction: 'ascending' | 'descending'): this {
    if (direction === 'ascending') {
      this.input.rangeOrder = 'ASC'
    } else if (direction === 'descending') {
      this.input.rangeOrder = 'DESC'
    }

    return this
  }

  ascending(): this {
    return this.sort('ascending')
  }

  descending(): this {
    return this.sort('descending')
  }

  /**
   * Page internally and return all possible search results.
   *
   * Be cautious. This can easily cause timeouts if you're using Lambda functions.
   * This is also non-ideal for scans, for better performance use a segmented scan
   * via the Query.PrimaryKey.segmentedScan or Query.GlobalSecondaryIndex.segmentedScan.
   */
  async all(): Promise<QueryOutput<T>> {
    const input = this.getInput()
    const outputs: Array<QueryOutput<T>> = []
    let page: QueryOutput<T> | undefined

    // if this is the first page, or if we have not hit the last page, continue loading records…
    while (page == null || page.lastEvaluatedKey != null) {
      if (page?.lastEvaluatedKey != null) {
        input.ExclusiveStartKey = page.lastEvaluatedKey
      }

      page = await this.page(input)
      outputs.push(page)
    }

    return QueryOutput.fromSeveralOutputs(this.tableClass, outputs)
  }

  getInput(): DynamoDB.ScanInput | DynamoDB.QueryInput {
    let indexMetadata: Metadata.Index.GlobalSecondaryIndex | Metadata.Index.PrimaryKey | undefined

    if (this.input.index != null && typeof this.input.index !== 'string') {
      this.input.indexName = this.input.index.metadata.name
    }

    if (this.input.indexName != null) {
      // if we were given an index, find the metadata object for it
      for (const index of this.tableClass.schema.globalSecondaryIndexes) {
        if (index.name === this.input.indexName) {
          indexMetadata = index
        }
      }

      if (indexMetadata == null) {
        for (const index of this.tableClass.schema.localSecondaryIndexes) {
          if (index.name === this.input.indexName) {
            indexMetadata = Object.assign({
              hash: this.tableClass.schema.primaryKey.hash,
            }, index) as Metadata.Index.GlobalSecondaryIndex
          }
        }
      }

      if (indexMetadata == null) {
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

    if (this.input.projectionExpression != null) {
      input.ProjectionExpression = this.input.projectionExpression
    }

    if (this.input.rangeOrder === 'DESC') {
      (input as any).ScanIndexForward = false
    }

    if (this.input.limit != null) {
      input.Limit = this.input.limit
    }

    if (this.input.exclusiveStartKey != null) {
      input.ExclusiveStartKey = this.input.exclusiveStartKey
    }

    if (this.input.consistent != null) {
      input.ConsistentRead = this.input.consistent
    }

    if (this.input.indexName != null) {
      input.IndexName = this.input.indexName
    }

    if (this.input.returnOnlyCount === true) {
      input.Select = 'COUNT'
    }

    if (query.KeyConditionExpression != null) {
      (input as DynamoDB.QueryInput).KeyConditionExpression = query.KeyConditionExpression
    }

    return input
  }

  /**
   * @deprecated Use MagicSearch.prototype.exec()
   */
  async search(): Promise<QueryOutput<T>> {
    return await this.exec()
  }

  async page(input: DynamoDB.ScanInput | DynamoDB.QueryInput): Promise<QueryOutput<T>> {
    let output: DynamoDB.ScanOutput | DynamoDB.QueryOutput

    // if we are filtering based on key conditions, run a query instead of a scan
    if ((input as DynamoDB.QueryInput).KeyConditionExpression != null) {
      output = await this.tableClass.schema.dynamo.query(input).promise()
    } else {
      if ((input as any).ScanIndexForward === false) {
        throw new Error('Cannot use specify a sort direction, range order, or use ScanIndexForward on a scan operation. Try specifying the index being used.')
      } else {
        delete (input as any).ScanIndexForward
      }

      output = await this.tableClass.schema.dynamo.scan(input).promise()
    }

    return QueryOutput.fromDynamoOutput(this.tableClass, output)
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

      const hashFilter: Filter<any> = get(filters, hash.name)

      // if there is an operator, ensure it is allowed as a key expression
      if (isArray(hashFilter)) {
        const operator = hashFilter[0]

        if (!includes(keyConditionAllowedOperators, operator)) {
          continue
        }
      }

      // if it has no range, then we're all done
      if (range == null) {
        return true
      }

      // check for the range now
      if (!has(filters, range.name)) {
        continue
      }

      const rangeFilter: Filter<any> = get(filters, range.name)

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
