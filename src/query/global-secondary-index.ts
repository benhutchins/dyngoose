import { DynamoDB } from 'aws-sdk'
import { size } from 'lodash'
import * as Metadata from '../metadata'
import { ITable, Table } from '../table'
import { buildQueryExpression } from './expression'
import { Filters as QueryFilters } from './filters'
import * as Query from './query'
import { Results as QueryResults } from './results'

type GSIKeyType = Query.ConditionValueType

interface GlobalSecondaryIndexQueryInput<HashKeyType extends GSIKeyType, RangeKeyType extends GSIKeyType> {
  rangeOrder?: 'ASC' | 'DESC'
  limit?: number
  exclusiveStartKey?: DynamoDB.Key
  consistent?: DynamoDB.ConsistentRead
}

interface GlobalSecondaryIndexGetInput<HashKeyType extends GSIKeyType, RangeKeyType extends GSIKeyType>
  extends GlobalSecondaryIndexQueryInput<HashKeyType, RangeKeyType> {
  hash: HashKeyType
  range?: Query.Condition<RangeKeyType>
}

interface GlobalSecondaryIndexScanInput {
  limit?: number
  select?: DynamoDB.Select
  totalSegments?: DynamoDB.ScanTotalSegments
  segment?: DynamoDB.ScanSegment
  exclusiveStartKey?: DynamoDB.Key
  projectionExpression?: DynamoDB.ProjectionExpression
  consistent?: DynamoDB.ConsistentRead
}

export class GlobalSecondaryIndex<T extends Table, HashKeyType extends GSIKeyType, RangeKeyType extends GSIKeyType> {
  constructor(
    readonly tableClass: ITable<T>,
    readonly metadata: Metadata.Index.GlobalSecondaryIndex,
  ) { }

  /**
   * Performs a query and returns the first item matching your filters.
   *
   * The regular DynamoDB.GetItem does not work for indexes, because DynamoDB only enforces a
   * unique cross of the tale's primary HASH and RANGE key. The combination of those two values
   * must always be unique, however, for a GlobalSecondaryIndex, there is no uniqueness checks
   * or requirements. This means that querying for a record by the HASH and RANGE on a
   * GlobalSecondaryIndex it is always possible there are multiple matching records.
   *
   * So use this with caution. It will still load all the results, and then only returns the
   * first received from DynamoDB. Avoid use whenever you do not have uniqueness for the
   * GlobalSecondaryIndex's HASH + RANGE.
   */
  public async get(input: GlobalSecondaryIndexGetInput<HashKeyType, RangeKeyType>): Promise<T | void> {
    const filters: QueryFilters = {
      [this.metadata.hash.propertyName]: input.hash,
    }

    if (this.metadata.range) {
      filters[this.metadata.range.propertyName] = input.range
    }

    const results = await this.query(filters, input)

    if (results.records.length > 0) {
      return results.records[0]
    }
  }

  public getQueryInput(input: GlobalSecondaryIndexQueryInput<HashKeyType, RangeKeyType> = {}) {
    if (!input.rangeOrder) {
      input.rangeOrder = 'ASC'
    }

    const ScanIndexForward = input.rangeOrder === 'ASC'
    const queryInput: DynamoDB.QueryInput = {
      TableName: this.tableClass.schema.name,
      Limit: input.limit,
      IndexName: this.metadata.name,
      ScanIndexForward,
      ExclusiveStartKey: input.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      ConsistentRead: input.consistent,
    }
    return queryInput
  }

  public async query(filters: QueryFilters, input?: GlobalSecondaryIndexQueryInput<HashKeyType, RangeKeyType>): Promise<QueryResults<T>> {
    if (!filters[this.metadata.hash.propertyName]) {
      throw new Error('Cannot perform a query on a GlobalSecondaryIndex without specifying a hash key value')
    }

    const queryInput = this.getQueryInput(input)
    const expression = buildQueryExpression(this.tableClass.schema, filters, this.metadata)
    queryInput.FilterExpression = expression.FilterExpression
    queryInput.KeyConditionExpression = expression.KeyConditionExpression
    queryInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
    queryInput.ExpressionAttributeValues = expression.ExpressionAttributeValues
    const output = await this.tableClass.schema.dynamo.query(queryInput).promise()
    return this.getQueryResults(output)
  }

  public getScanInput(input: GlobalSecondaryIndexScanInput = {}) {
    const scanInput: DynamoDB.ScanInput = {
      TableName: this.tableClass.schema.name,
      IndexName: this.metadata.name,
      Limit: input.limit,
      ExclusiveStartKey: input.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      TotalSegments: input.totalSegments,
      Segment: input.segment,
      Select: input.select,
      ProjectionExpression: input.projectionExpression,
      ConsistentRead: input.consistent,
    }

    return scanInput
  }

  /**
   * Performs a DynamoDB Scan.
   *
   * *WARNING*: In most circumstances this is not a good thing to do.
   * This will return all the items in this index, does not perform well!
   */
  public async scan(filters: QueryFilters | void | null, input: GlobalSecondaryIndexScanInput = {}): Promise<QueryResults<T>> {
    const scanInput = this.getScanInput(input)
    if (filters && size(filters) > 0) {
      // don't pass the index metadata, avoids KeyConditionExpression
      const expression = buildQueryExpression(this.tableClass.schema, filters)
      scanInput.FilterExpression = expression.FilterExpression
      scanInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
      scanInput.ExpressionAttributeValues = expression.ExpressionAttributeValues
    }
    const output = await this.tableClass.schema.dynamo.scan(scanInput).promise()
    return this.getQueryResults(output)
  }

  private getQueryResults(output: DynamoDB.ScanOutput | DynamoDB.QueryOutput): QueryResults<T> {
    const records: T[] = (output.Items || []).map((item) => {
      return this.tableClass.fromDynamo(item)
    })

    return {
      records,
      count: output.Count || records.length,
      scannedCount: output.ScannedCount as number,
      lastEvaluatedKey: output.LastEvaluatedKey,
      consumedCapacity: output.ConsumedCapacity as DynamoDB.ConsumedCapacity,
    }
  }
}
