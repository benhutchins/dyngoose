import { DynamoDB } from 'aws-sdk'
import { get, has, includes, isArray } from 'lodash'
import { Attribute } from '../attribute'
import { QueryError } from '../errors'
import { Metadata } from '../index'
import { ITable, Table } from '../table'
import { buildQueryExpression, keyConditionAllowedOperators } from './expression'
import { Filter as QueryFilter, Filters as QueryFilters } from './filters'
import { Results as QueryResults } from './results'

export interface MagicSearchInput {
  /**
   * Tell the magic search to page internally and return all possible search results.
   *
   * Be cautious. This can easily cause timeouts if you're using Lambda functions.
   *
   * Defaults to `false`.
   */
  all?: boolean

  indexName?: string
}

/**
 * Use this via Table.search()
 */
export class MagicSearch<T extends Table> {
  constructor(private tableClass: ITable<T>, private filters: QueryFilters<T>, private input: MagicSearchInput = {}) {
  }

  getInput(): DynamoDB.ScanInput | DynamoDB.QueryInput {
    let indexMetadata: Metadata.Index.GlobalSecondaryIndex | Metadata.Index.PrimaryKey | undefined

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

    if (this.input.indexName) {
      input.IndexName = this.input.indexName
    }

    if (query.KeyConditionExpression) {
      (input as DynamoDB.QueryInput).KeyConditionExpression = query.KeyConditionExpression
    }

    return input
  }

  async search(): Promise<QueryResults<T>> {
    const input = this.getInput()

    if (!this.input.all) {
      return this.page(input)
    } else {
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
  }

  async page(input: DynamoDB.ScanInput | DynamoDB.QueryInput): Promise<QueryResults<T>> {
    let output: DynamoDB.ScanOutput | DynamoDB.QueryOutput

    // if we are filtering based on key conditions, run a query instead of a scan
    if ((input as DynamoDB.QueryInput).KeyConditionExpression) {
      output = await this.tableClass.schema.dynamo.query(input).promise()
    } else {
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
    if (!has(this.filters, hash.name)) {
      return false
    }

    const hashFilter: QueryFilter<any> = get(this.filters, hash.name)

    // if there is an operator, ensure it is allowed as a key expression
    if (isArray(hashFilter)) {
      const operator = hashFilter[0]

      if (!includes(keyConditionAllowedOperators, operator)) {
        return false
      }
    }

    // if it has no range, then we're all done
    if (!range) {
      return true
    }

    // check for the range now
    if (!has(this.filters, range.name)) {
      return false
    }

    const rangeFilter: QueryFilter<any> = get(this.filters, range.name)

    // if there is an operator, ensure it is allowed as a key expression
    if (isArray(rangeFilter)) {
      const operator = rangeFilter[0]

      if (!includes(keyConditionAllowedOperators, operator)) {
        return false
      }
    }

    return true
  }
}
