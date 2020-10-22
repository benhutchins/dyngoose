import { DynamoDB } from 'aws-sdk'
import { get, has, isArray } from 'lodash'
import { QueryError } from '../errors'
import * as Metadata from '../metadata'
import { ITable, Table } from '../table'
import { buildQueryExpression } from './expression'
import { Filters as QueryFilters } from './filters'
import { Results as QueryResults } from './results'
import { MagicSearch, MagicSearchInput } from './search'

interface GlobalSecondaryIndexQueryInput {
  /**
   * Specify the direction to order using your RANGE key
   *
   * Defaults to ASC
   */
  rangeOrder?: 'ASC' | 'DESC'

  limit?: number
  exclusiveStartKey?: DynamoDB.Key
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

interface GlobalSecondaryIndexSegmentedScanInput extends GlobalSecondaryIndexScanInput {
  totalSegments: DynamoDB.ScanTotalSegments
}

export class GlobalSecondaryIndex<T extends Table> {
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
  public async get(filters: QueryFilters<T>): Promise<T | undefined> {
    if (!has(filters, this.metadata.hash.propertyName)) {
      throw new QueryError('Cannot perform a query on a GlobalSecondaryIndex without specifying a hash key value')
    } else if (this.metadata.range != null && !has(filters, this.metadata.range.propertyName)) {
      throw new QueryError('Cannot perform a query on a GlobalSecondaryIndex with a range key without specifying a range value')
    }

    const results = await this.query(filters)

    if (results.records.length > 0) {
      return results.records[0]
    }
  }

  public getQueryInput(input: GlobalSecondaryIndexQueryInput = {}): DynamoDB.QueryInput {
    if (input.rangeOrder == null) {
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

      /**
       * Global secondary indexes support eventually consistent reads only,
       * so do not specify ConsistentRead when querying a global secondary index.
       * @see {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#query-property}
       */
      // ConsistentRead: input.consistent,
    }
    return queryInput
  }

  public async query(filters: QueryFilters<T>, input?: GlobalSecondaryIndexQueryInput): Promise<QueryResults<T>> {
    if (!has(filters, this.metadata.hash.propertyName)) {
      throw new QueryError('Cannot perform a query on a GlobalSecondaryIndex without specifying a hash key value')
    } else if (isArray(get(filters, this.metadata.hash.propertyName)) && get(filters, this.metadata.hash.propertyName)[0] !== '=') {
      throw new QueryError('DynamoDB only supports using equal operator for the HASH key')
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

  public getScanInput(input: GlobalSecondaryIndexScanInput = {}): DynamoDB.ScanInput {
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
  public async scan(filters?: QueryFilters<T> | undefined | null, input: GlobalSecondaryIndexScanInput = {}): Promise<QueryResults<T>> {
    const scanInput = this.getScanInput(input)
    if (filters != null && Object.keys(filters).length > 0) {
      // don't pass the index metadata, avoids KeyConditionExpression
      const expression = buildQueryExpression(this.tableClass.schema, filters)
      scanInput.FilterExpression = expression.FilterExpression
      scanInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
      scanInput.ExpressionAttributeValues = expression.ExpressionAttributeValues
    }
    const output = await this.tableClass.schema.dynamo.scan(scanInput).promise()
    return this.getQueryResults(output)
  }

  /**
   * Performs a parallel segmented scan for you.
   *
   * You must provide the total number of segments you want to perform.
   *
   * It is recommend you also provide a Limit for the segments, which can help prevent situations
   * where one of the workers consumers all of the provisioned throughput, at the expense of the
   * other workers.
   *
   * @see {@link https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html#Scan.ParallelScan}
   */
  public async segmentedScan(filters: QueryFilters<T> | null, input: GlobalSecondaryIndexSegmentedScanInput): Promise<QueryResults<T>> {
    const scans: Array<Promise<QueryResults<T>>> = []
    for (let i = 0; i < input.totalSegments; i++) {
      input.segment = i
      scans.push(this.scan(filters, input))
    }

    const results = await Promise.all(scans)
    let records: T[] = []
    let scannedCount = 0
    let capacityUnits = 0
    let writeCapacityUnits = 0
    let readCapacityUnits = 0

    for (const result of results) {
      records = records.concat(result.records)
      scannedCount += result.scannedCount

      if (result.consumedCapacity != null) {
        if (result.consumedCapacity.CapacityUnits != null) {
          capacityUnits += result.consumedCapacity.CapacityUnits
        }

        if (result.consumedCapacity.WriteCapacityUnits != null) {
          writeCapacityUnits += result.consumedCapacity.WriteCapacityUnits
        }

        if (result.consumedCapacity.ReadCapacityUnits != null) {
          readCapacityUnits += result.consumedCapacity.ReadCapacityUnits
        }
      }
    }

    return {
      records,
      count: records.length,
      scannedCount: scannedCount,
      consumedCapacity: {
        CapacityUnits: capacityUnits,
        WriteCapacityUnits: writeCapacityUnits,
        ReadCapacityUnits: readCapacityUnits,
      },
    }
  }

  /**
   * Query DynamoDB for what you need.
   *
   * Starts a MagicSearch using this GlobalSecondaryIndex.
   */
  public search(filters?: QueryFilters<T>, input: MagicSearchInput<T> = {}): MagicSearch<T> {
    return new MagicSearch<T>(this.tableClass as any, filters, input).using(this)
  }

  protected getQueryResults(output: DynamoDB.ScanOutput | DynamoDB.QueryOutput): QueryResults<T> {
    const records: T[] = []

    if (output.Items != null) {
      for (const item of output.Items) {
        records.push(this.tableClass.fromDynamo(item))
      }
    }

    return {
      records,
      count: output.Count == null ? records.length : output.Count,
      scannedCount: output.ScannedCount as number,
      lastEvaluatedKey: output.LastEvaluatedKey,
      consumedCapacity: output.ConsumedCapacity as DynamoDB.ConsumedCapacity,
    }
  }
}
