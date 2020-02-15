import { DynamoDB } from 'aws-sdk'
import * as Metadata from '../metadata'
import { ITable, Table } from '../table'
import { batchGet } from './batch_get'
import { batchWrite } from './batch_write'
import * as Query from './query'

const HASH_KEY_REF = '#hk'
const HASH_VALUE_REF = ':hkv'

const RANGE_KEY_REF = '#rk'

type PrimaryKeyType = Query.ConditionValueType

interface PrimaryKeyBatchInput<HashKeyType extends PrimaryKeyType, RangeKeyType extends PrimaryKeyType> {
  hash: HashKeyType
  range: RangeKeyType
}

interface PrimaryKeyGetInput<HashKeyType extends PrimaryKeyType, RangeKeyType extends PrimaryKeyType>
  extends PrimaryKeyBatchInput<HashKeyType, RangeKeyType> {
  projectionExpression?: DynamoDB.ProjectionExpression
  consistent?: DynamoDB.ConsistentRead
  returnConsumedCapacity?: DynamoDB.ReturnConsumedCapacity
}

interface PrimaryKeyUpdateItem<HashKeyType extends PrimaryKeyType, RangeKeyType extends PrimaryKeyType>
  extends PrimaryKeyBatchInput<HashKeyType, RangeKeyType> {
  changes: { [key: string]: any }
}

interface IPrimaryKey<T extends Table, HashKeyType extends PrimaryKeyType, RangeKeyType extends PrimaryKeyType> {
  getDeleteItemInput(hashKey: HashKeyType, rangeKey: RangeKeyType): DynamoDB.DeleteItemInput
  delete(hashKey: HashKeyType, rangeKey: RangeKeyType): Promise<DynamoDB.DeleteItemOutput>
  getGetItemInput(input: PrimaryKeyGetInput<HashKeyType, RangeKeyType>): DynamoDB.GetItemInput
  get(hashKey: HashKeyType, rangeKey: RangeKeyType): Promise<T | null>
  getItem(input: PrimaryKeyGetInput<HashKeyType, RangeKeyType>): Promise<T | null>
  batchGet(inputs: PrimaryKeyBatchInput<HashKeyType, RangeKeyType>[]): Promise<Array<T | null>>
  batchDelete(inputs: PrimaryKeyBatchInput<HashKeyType, RangeKeyType>[]): Promise<any>
  query(options: any): Promise<any>
  scan(options: any): Promise<any>
  update(input: PrimaryKeyUpdateItem<HashKeyType, RangeKeyType>): Promise<void>
}

export class PrimaryKey<T extends Table, HashKeyType extends PrimaryKeyType, RangeKeyType extends PrimaryKeyType>
  implements IPrimaryKey<T, HashKeyType, RangeKeyType> {
  constructor(
    readonly table: ITable<T>,
    readonly metadata: Metadata.Index.PrimaryKey,
  ) {}

  public getDeleteItemInput(hash: HashKeyType, range: RangeKeyType) {
    const input: DynamoDB.DeleteItemInput = {
      TableName: this.table.schema.name,
      // ReturnValues: "ALL_OLD",
      Key: {
        [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(hash),
      },
    }

    if (this.metadata.range) {
      input.Key[this.metadata.range.name] = this.metadata.range.toDynamoAssert(range)
    }

    return input
  }

  public async delete(hash: HashKeyType, range: RangeKeyType) {
    const input = this.getDeleteItemInput(hash, range)
    return await this.table.schema.dynamo.deleteItem(input).promise()
  }

  public getGetItemInput(input: PrimaryKeyGetInput<HashKeyType, RangeKeyType>) {
    const getItemInput: DynamoDB.GetItemInput = {
      TableName: this.table.schema.name,
      Key: {
        [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(input.hash),
      },
      ProjectionExpression: input.projectionExpression,
      ConsistentRead: input.consistent,
      ReturnConsumedCapacity: input.returnConsumedCapacity,
    }

    if (this.metadata.range && input.range) {
      getItemInput.Key[this.metadata.range.name] = this.metadata.range.toDynamoAssert(input.range)
    }

    return getItemInput
  }

  public async get(hash: HashKeyType, range: RangeKeyType): Promise<T | null> {
    const getItemInput = this.getGetItemInput({ hash, range })
    const dynamoRecord = await this.table.schema.dynamo.getItem(getItemInput).promise()
    if (!dynamoRecord.Item) {
      return null
    } else {
      return this.table.fromDynamo(dynamoRecord.Item)
    }
  }

  public async getItem(input: PrimaryKeyGetInput<HashKeyType, RangeKeyType>): Promise<T | null> {
    const getItemInput = this.getGetItemInput(input)
    const dynamoRecord = await this.table.schema.dynamo.getItem(getItemInput).promise()
    if (!dynamoRecord.Item) {
      return null
    } else {
      return this.table.fromDynamo(dynamoRecord.Item)
    }
  }

  public async batchGet(inputs: PrimaryKeyBatchInput<HashKeyType, RangeKeyType>[]): Promise<Array<T | null>> {
    const res = await batchGet(
      this.table.schema.dynamo,
      this.table.schema.name,
      inputs.map((input) => {
        const key: DynamoDB.Key = {
          [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(input.hash),
        }

        if (this.metadata.range) {
          key[this.metadata.range.name] = this.metadata.range.toDynamoAssert(input.range)
        }

        return key
      }),
    )

    return res.map((item) => {
      if (item) {
        return this.table.fromDynamo(item)
      } else {
        return null
      }
    })
  }

  public async batchDelete(inputs: PrimaryKeyBatchInput<HashKeyType, RangeKeyType>[]) {
    return await batchWrite(
      this.table.schema.dynamo,
      this.table.schema.name,
      inputs.map((input) => {
        const deleteRequest: DynamoDB.DeleteRequest = {
          Key: {
            [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(input.hash),
          },
        }

        if (this.metadata.range) {
          deleteRequest.Key[this.metadata.range.name] = this.metadata.range.toDynamoAssert(input.range)
        }

        const request: DynamoDB.WriteRequest = {
          DeleteRequest: deleteRequest,
        }

        return request
      }),
    )
  }

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
      TableName: this.table.schema.name,
      Limit: options.limit,
      ScanIndexForward,
      ExclusiveStartKey: options.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      KeyConditionExpression: `${HASH_KEY_REF} = ${HASH_VALUE_REF}`,
      ExpressionAttributeNames: {
        [HASH_KEY_REF]: this.metadata.hash.name,
      },
      ExpressionAttributeValues: {
        [HASH_VALUE_REF]: options.hash,
      },
      ConsistentRead: options.consistent,
    }

    if (this.metadata.range && options.range) {
      const rangeKeyOptions = Query.parseCondition(this.metadata.range, options.range, RANGE_KEY_REF)
      params.KeyConditionExpression += ` AND ${rangeKeyOptions.conditionExpression}`
      Object.assign(params.ExpressionAttributeNames, { [RANGE_KEY_REF]: this.metadata.range.name })
      Object.assign(params.ExpressionAttributeValues, rangeKeyOptions.expressionAttributeValues)
    }

    const result = await this.table.schema.dynamo.query(params).promise()

    return {
      records: (result.Items || []).map((item) => {
        return this.table.fromDynamo(item)
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
      TableName: this.table.schema.name,
      Limit: options.limit,
      ExclusiveStartKey: options.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      TotalSegments: options.totalSegments,
      Segment: options.segment,
    }

    const result = await this.table.schema.dynamo.scan(params).promise()

    return {
      records: (result.Items || []).map((item) => {
        return this.table.fromDynamo(item)
      }),
      count: result.Count,
      scannedCount: result.ScannedCount,
      lastEvaluatedKey: result.LastEvaluatedKey,
      consumedCapacity: result.ConsumedCapacity,
    }
  }

  /**
   * This will create a temporary Table instance, then calls record.fromJSON() passing your requested changes.
   * record.fromJSON() handles setting and deleting attributes.
   *
   * It then has the Table.Schema build the DynamoDB.UpdateItemInput with all the requested changes.
   */
  public async update(input: PrimaryKeyUpdateItem<HashKeyType, RangeKeyType>): Promise<void> {
    const keyMap: DynamoDB.AttributeMap = {
      [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(input.hash),
    }

    if (this.metadata.range) {
      keyMap[this.metadata.range.name] = this.metadata.range.toDynamoAssert(input.range)
    }

    return this.table.fromDynamo(keyMap).fromJSON(input.changes).save()
  }
}
