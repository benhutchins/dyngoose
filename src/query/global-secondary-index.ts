import { DynamoDB } from 'aws-sdk'
import { get, has, isArray } from 'lodash'
import { QueryError } from '../errors'
import * as Metadata from '../metadata'
import { ITable, Table } from '../table'
import { buildQueryExpression } from './expression'
import { Filters as QueryFilters } from './filters'
import { QueryOutput } from './output'
import { buildProjectionExpression } from './projection-expression'
import { MagicSearch, MagicSearchInput } from './search'

interface GlobalSecondaryIndexGetInput {
  /**
   * Allow Dyngoose to build the projection expression for your query.
   *
   * Pass the list of attributes you'd like retrieved. These do not have to be the attributes specific
   * to the index. If you'd like to retrieve all the attributes in the parent table, specify `select`
   * with a value of `ALL`
   */
  attributes?: string[]

  /**
   * Manually specify the ProjectionExpression for your query.
   *
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html
   */
  projectionExpression?: DynamoDB.ProjectionExpression

  /**
   * Optionally used when you manually specify the ProjectionExpression for your query.
   *
   * This is written for you when specifying `attributes`.
   */
  expressionAttributeNames?: DynamoDB.ExpressionAttributeNameMap
}

interface GlobalSecondaryIndexQueryScanSharedInput extends GlobalSecondaryIndexGetInput {
  /**
   * Instead of retrieving the attributes for items you can return the number of results that match your query.
   *
   * When specifying a `projectionExpression` or `attributes` option, this will have no effect.
   */
  select?: 'COUNT'

  /**
   * Limit the number of items that are read.
   *
   * For example, suppose that you query a table, with a Limit value of 6, and without a filter expression.
   * The Query result contains the first six items from the table that match the key condition expression from the request.
   *
   * Now suppose that you add a filter expression to the Query. In this case, DynamoDB reads up to six items,
   * and then returns only those that match the filter expression. The final query result contains six items
   * or fewer, even if more items would have matched the filter expression if DynamoDB had kept reading more items.
   *
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#Query.Limit
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html#Scan.Limit
   */
  limit?: number

  exclusiveStartKey?: DynamoDB.Key
}

interface GlobalSecondaryIndexQueryInput extends GlobalSecondaryIndexQueryScanSharedInput {
  /**
   * Specify the direction to order using your RANGE key
   *
   * Defaults to ASC
   */
  rangeOrder?: 'ASC' | 'DESC'
}

interface GlobalSecondaryIndexScanInput extends GlobalSecondaryIndexQueryScanSharedInput {
  totalSegments?: DynamoDB.ScanTotalSegments
  segment?: DynamoDB.ScanSegment
  consistent?: DynamoDB.ConsistentRead
}

interface GlobalSecondaryIndexSegmentedScanInput extends GlobalSecondaryIndexScanInput {
  limit: number
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
  public async get(filters: QueryFilters<T>, input: GlobalSecondaryIndexGetInput = {}): Promise<T | undefined> {
    if (!has(filters, this.metadata.hash.propertyName)) {
      throw new QueryError('Cannot perform .get() on a GlobalSecondaryIndex without specifying a hash key value')
    } else if (this.metadata.range != null && !has(filters, this.metadata.range.propertyName)) {
      throw new QueryError('Cannot perform .get() on a GlobalSecondaryIndex with a range key without specifying a range value')
    } else if (Object.keys(filters).length > 2) {
      throw new QueryError('Cannot perform a .get() on a GlobalSecondaryIndex with additional filters, use .query() instead')
    }

    (input as GlobalSecondaryIndexQueryInput).limit = 1

    // because you are specifying the hashKey and rangeKey, we can apply a limit to this search
    // DynamoDB will start the search at the first match and limit means it will only process
    // that document and return it, however, you cannot use any additional filters on this .get
    // method; for that, you need to use .query()
    const results = await this.query(filters, input)

    if (results.count > 0) {
      return results[0]
    }
  }

  public getQueryInput(input: GlobalSecondaryIndexQueryInput = {}, filters?: QueryFilters<T>): DynamoDB.QueryInput {
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

    if (input.select === 'COUNT') {
      queryInput.Select = 'COUNT'
    }

    if (input.attributes != null && input.projectionExpression == null) {
      const expression = buildProjectionExpression(this.tableClass, input.attributes)
      queryInput.Select = 'SPECIFIC_ATTRIBUTES'
      queryInput.ProjectionExpression = expression.ProjectionExpression
      queryInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
    } else if (input.projectionExpression != null) {
      queryInput.Select = 'SPECIFIC_ATTRIBUTES'
      queryInput.ProjectionExpression = input.projectionExpression
      queryInput.ExpressionAttributeNames = input.expressionAttributeNames
    }

    if (filters != null && Object.keys(filters).length > 0) {
      const expression = buildQueryExpression(this.tableClass.schema, filters, this.metadata)
      queryInput.FilterExpression = expression.FilterExpression
      queryInput.KeyConditionExpression = expression.KeyConditionExpression
      queryInput.ExpressionAttributeValues = expression.ExpressionAttributeValues

      if (queryInput.ExpressionAttributeNames == null) {
        queryInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
      } else {
        Object.assign(queryInput.ExpressionAttributeNames, expression.ExpressionAttributeNames)
      }
    }

    return queryInput
  }

  public async query(filters: QueryFilters<T>, input?: GlobalSecondaryIndexQueryInput): Promise<QueryOutput<T>> {
    if (!has(filters, this.metadata.hash.propertyName)) {
      throw new QueryError('Cannot perform a query on a GlobalSecondaryIndex without specifying a hash key value')
    } else if (isArray(get(filters, this.metadata.hash.propertyName)) && get(filters, this.metadata.hash.propertyName)[0] !== '=') {
      throw new QueryError('DynamoDB only supports using equal operator for the HASH key')
    }

    const queryInput = this.getQueryInput(input, filters)
    const hasProjection = queryInput.ProjectionExpression == null
    const output = await this.tableClass.schema.dynamo.query(queryInput).promise()
    return QueryOutput.fromDynamoOutput<T>(this.tableClass, output, hasProjection)
  }

  public getScanInput(input: GlobalSecondaryIndexScanInput = {}, filters?: QueryFilters<T>): DynamoDB.ScanInput {
    const scanInput: DynamoDB.ScanInput = {
      TableName: this.tableClass.schema.name,
      IndexName: this.metadata.name,
      Limit: input.limit,
      ExclusiveStartKey: input.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      TotalSegments: input.totalSegments,
      Segment: input.segment,
      Select: input.select,
      ConsistentRead: input.consistent,
    }

    if (input.attributes != null && input.projectionExpression == null) {
      const expression = buildProjectionExpression(this.tableClass, input.attributes)
      scanInput.ProjectionExpression = expression.ProjectionExpression
      scanInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
    } else if (input.projectionExpression != null) {
      scanInput.ProjectionExpression = input.projectionExpression
      scanInput.ExpressionAttributeNames = input.expressionAttributeNames
    }

    if (filters != null && Object.keys(filters).length > 0) {
      // don't pass the index metadata, avoids KeyConditionExpression
      const expression = buildQueryExpression(this.tableClass.schema, filters)
      scanInput.FilterExpression = expression.FilterExpression
      scanInput.ExpressionAttributeValues = expression.ExpressionAttributeValues

      if (scanInput.ExpressionAttributeNames == null) {
        scanInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
      } else {
        Object.assign(scanInput.ExpressionAttributeNames, expression.ExpressionAttributeNames)
      }
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
    const scanInput = this.getScanInput(input, filters == null ? undefined : filters)
    const hasProjection = scanInput.ProjectionExpression == null
    const output = await this.tableClass.schema.dynamo.scan(scanInput).promise()
    return QueryOutput.fromDynamoOutput<T>(this.tableClass, output, hasProjection)
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
  public async segmentedScan(filters: QueryFilters<T> | undefined | null, input: GlobalSecondaryIndexSegmentedScanInput): Promise<QueryOutput<T>> {
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
