import { DynamoDB } from 'aws-sdk'
import * as Metadata from '../metadata'
import { ITable, Table } from '../table'
import { buildQueryExpression } from './expression'
import { Filters as QueryFilters } from './filters'
import * as Query from './query'
import { Results as QueryResults } from './results'

const HASH_KEY_REF = '#hk'
const HASH_VALUE_REF = ':hkv'
const RANGE_KEY_REF = '#rk'

type GSIKeyType = Query.ConditionValueType

interface GlobalSecondaryIndexQueryInput<HashKeyType extends GSIKeyType, RangeKeyType extends GSIKeyType> {
  hash: HashKeyType
  range?: Query.Condition<RangeKeyType>
  rangeOrder?: 'ASC' | 'DESC'
  limit?: number
  exclusiveStartKey?: DynamoDB.Key
  consistent?: DynamoDB.ConsistentRead
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
  public async get(options: GlobalSecondaryIndexQueryInput<HashKeyType, RangeKeyType>): Promise<T | null> {
    const results = await this.query(options)
    if (results.records.length > 0) {
      return results.records[0]
    }
    return null
  }

  public async query(options: GlobalSecondaryIndexQueryInput<HashKeyType, RangeKeyType>): Promise<QueryResults<T>> {
    if (!options.rangeOrder) {
      options.rangeOrder = 'ASC'
    }
    const ScanIndexForward = options.rangeOrder === 'ASC'

    const params: DynamoDB.QueryInput = {
      TableName: this.tableClass.schema.name,
      Limit: options.limit,
      IndexName: this.metadata.name,
      ScanIndexForward,
      ExclusiveStartKey: options.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      KeyConditionExpression: `${HASH_KEY_REF} = ${HASH_VALUE_REF}`,
      ExpressionAttributeNames: {
        [HASH_KEY_REF]: this.metadata.hash.name,
      },
      ExpressionAttributeValues: {
        [HASH_VALUE_REF]: this.metadata.hash.toDynamoAssert(options.hash),
      },
      ConsistentRead: options.consistent,
    }

    if (this.metadata.range && options.range) {
      const rangeKeyOptions = Query.parseCondition(this.metadata.range, options.range, RANGE_KEY_REF)
      params.KeyConditionExpression += ` AND ${rangeKeyOptions.conditionExpression}`
      Object.assign(params.ExpressionAttributeNames, { [RANGE_KEY_REF]: this.metadata.range.name })
      Object.assign(params.ExpressionAttributeValues, rangeKeyOptions.expressionAttributeValues)
    }

    const result = await this.tableClass.schema.dynamo.query(params).promise()

    return this.getQueryResults(result)
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
   *
   * This method supports no filtering, to use a query, use scanFilter.
   */
  public async scan(input: GlobalSecondaryIndexScanInput = {}): Promise<QueryResults<T>> {
    const scanInput = this.getScanInput(input)
    const output = await this.tableClass.schema.dynamo.scan(scanInput).promise()
    return this.getQueryResults(output)
  }

  /**
   * Performs a filtered DynamoDB Scan.
   *
   * *WARNING*: In most circumstances this is not a good thing to do.
   * This will look at every single item in this index, does not perform well!
   */
  public async scanFilter(filters: QueryFilters, input: GlobalSecondaryIndexScanInput = {}) {
    const scanInput = this.getScanInput(input)
    const expression = buildQueryExpression(this.tableClass.schema, filters) // don't pass the index metadata, avoids KeyConditionExpression
    scanInput.FilterExpression = expression.FilterExpression
    scanInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
    scanInput.ExpressionAttributeValues = expression.ExpressionAttributeValues
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

// export class FullGlobalSecondaryIndex<T extends Table, HashKeyType, RangeKeyType> extends GlobalSecondaryIndex<T> {
//   public async query(input: GlobalSecondaryIndexQueryInput<HashKeyType, RangeKeyType>) {
//     return super.query(input)
//   }

//   public async scan(input: GlobalSecondaryIndexScanInput = {}) {
//     return super.scan(input)
//   }
// }

// export class HashGlobalSecondaryIndex<T extends Table, HashKeyType> extends GlobalSecondaryIndex<T> {
//   public async query(input: GlobalSecondaryIndexQueryInput<HashKeyType, any>) {
//     return super.query(input)
//   }

//   public async scan(input: GlobalSecondaryIndexScanInput = {}) {
//     return super.scan(input)
//   }
// }
