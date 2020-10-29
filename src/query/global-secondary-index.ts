import { DynamoDB } from 'aws-sdk'
import { get, has, isArray } from 'lodash'
import { QueryError } from '../errors'
import * as Metadata from '../metadata'
import { ITable, Table } from '../table'
import { buildQueryExpression } from './expression'
import { Filters as QueryFilters } from './filters'
import { QueryOutput } from './output'
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
   * So use this with caution. It sets the DynamoDB Limit parameter to 1, which means this will
   * not work for additional filtering. If you want to provide additional filtering, use the
   * .query() method and pass your filters, then handle if the query has more than one result.
   *
   * Avoid use whenever you do not have uniqueness for the GlobalSecondaryIndex's HASH + RANGE.
   */
  public async get(filters: QueryFilters<T>): Promise<T | undefined> {
    if (!has(filters, this.metadata.hash.propertyName)) {
      throw new QueryError('Cannot perform .get() on a GlobalSecondaryIndex without specifying a hash key value')
    } else if (this.metadata.range != null && !has(filters, this.metadata.range.propertyName)) {
      throw new QueryError('Cannot perform .get() on a GlobalSecondaryIndex with a range key without specifying a range value')
    } else if (Object.keys(filters).length > 2) {
      throw new QueryError('Cannot perform a .get() on a GlobalSecondaryIndex with additional filters, use .query() instead')
    }

    // because you are specifying the hashKey and rangeKey, we can apply a limit to this search
    // DynamoDB will start the search at the first match and limit means it will only process
    // that document and return it, however, you cannot use any additional filters on this .get
    // method; for that, you need to use .query()
    const results = await this.query(filters, { limit: 1 })

    if (results.count > 0) {
      return results[0]
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

  public async query(filters: QueryFilters<T>, input?: GlobalSecondaryIndexQueryInput): Promise<QueryOutput<T>> {
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
    return QueryOutput.fromDynamoOutput<T>(this.tableClass, output)
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
  public async scan(filters?: QueryFilters<T> | undefined | null, input: GlobalSecondaryIndexScanInput = {}): Promise<QueryOutput<T>> {
    const scanInput = this.getScanInput(input)
    if (filters != null && Object.keys(filters).length > 0) {
      // don't pass the index metadata, avoids KeyConditionExpression
      const expression = buildQueryExpression(this.tableClass.schema, filters)
      scanInput.FilterExpression = expression.FilterExpression
      scanInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
      scanInput.ExpressionAttributeValues = expression.ExpressionAttributeValues
    }
    const output = await this.tableClass.schema.dynamo.scan(scanInput).promise()
    return QueryOutput.fromDynamoOutput<T>(this.tableClass, output)
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
  public async segmentedScan(filters: QueryFilters<T> | null, input: GlobalSecondaryIndexSegmentedScanInput): Promise<QueryOutput<T>> {
    const scans: Array<Promise<QueryOutput<T>>> = []
    for (let i = 0; i < input.totalSegments; i++) {
      input.segment = i
      scans.push(this.scan(filters, input))
    }

    const scanOutputs = await Promise.all(scans)
    const output = QueryOutput.fromSeveralOutputs(this.tableClass, scanOutputs)
    return output
  }

  /**
   * Query DynamoDB for what you need.
   *
   * Starts a MagicSearch using this GlobalSecondaryIndex.
   */
  public search(filters?: QueryFilters<T>, input: MagicSearchInput<T> = {}): MagicSearch<T> {
    return new MagicSearch<T>(this.tableClass as any, filters, input).using(this)
  }
}
