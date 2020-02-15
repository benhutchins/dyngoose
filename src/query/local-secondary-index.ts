import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import * as Metadata from '../metadata'
import { ITable, Table } from '../table'
import * as Query from './query'

const HASH_KEY_REF = '#hk'
const HASH_VALUE_REF = ':hkv'

const RANGE_KEY_REF = '#rk'

type PrimaryKeyType = Query.ConditionValueType

export class LocalSecondaryIndex<T extends Table, HashKeyType extends PrimaryKeyType, RangeKeyType extends PrimaryKeyType> {
  constructor(
    readonly tableClass: ITable<T>,
    readonly metadata: Metadata.Index.LocalSecondaryIndex,
  ) {}

  public async query(options: {
    hash: HashKeyType,
    range?: Query.Condition<RangeKeyType>,
    rangeOrder?: 'ASC' | 'DESC',
    limit?: number,
    exclusiveStartKey?: DynamoDB.DocumentClient.Key,
    consistent?: boolean,
  }) {
    if (!options.rangeOrder) {
      options.rangeOrder = 'ASC'
    }
    const ScanIndexForward = options.rangeOrder === 'ASC'

    const params: DynamoDB.DocumentClient.QueryInput = {
      TableName: this.tableClass.schema.name,
      Limit: options.limit,
      IndexName: this.metadata.name,
      ScanIndexForward,
      ExclusiveStartKey: options.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      KeyConditionExpression: `${HASH_KEY_REF} = ${HASH_VALUE_REF}`,
      ExpressionAttributeNames: {
        [HASH_KEY_REF]: this.tableClass.schema.primaryKey.hash.name,
      },
      ExpressionAttributeValues: {
        [HASH_VALUE_REF]: this.tableClass.schema.primaryKey.hash.toDynamoAssert(options.hash),
      },
      ConsistentRead: options.consistent,
    }

    if (options.range) {
      const rangeKeyOptions = Query.parseCondition(this.metadata.range, options.range, RANGE_KEY_REF)
      params.KeyConditionExpression += ` AND ${rangeKeyOptions.conditionExpression}`
      Object.assign(params.ExpressionAttributeNames, { [RANGE_KEY_REF]: this.metadata.range.name })
      Object.assign(params.ExpressionAttributeValues, rangeKeyOptions.expressionAttributeValues)
    }

    const result = await this.tableClass.schema.dynamo.query(params).promise()

    return {
      records: (result.Items || []).map((item) => {
        return this.tableClass.fromDynamo(item)
      }),
      count: result.Count,
      scannedCount: result.ScannedCount,
      lastEvaluatedKey: result.LastEvaluatedKey,
      consumedCapacity: result.ConsumedCapacity,
    }
  }

  public async scan(options: {
    limit?: number,
    totalSegments?: number,
    segment?: number,
    exclusiveStartKey?: DynamoDB.DocumentClient.Key,
  } = {}) {
    const params: DynamoDB.DocumentClient.ScanInput = {
      TableName: this.tableClass.schema.name,
      Limit: options.limit,
      ExclusiveStartKey: options.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      TotalSegments: options.totalSegments,
      Segment: options.segment,
    }

    const result = await this.tableClass.schema.dynamo.scan(params).promise()

    return {
      records: (result.Items || []).map((item) => {
        return this.tableClass.fromDynamo(item)
      }),
      count: result.Count,
      scannedCount: result.ScannedCount,
      lastEvaluatedKey: result.LastEvaluatedKey,
      consumedCapacity: result.ConsumedCapacity,
    }
  }
}
