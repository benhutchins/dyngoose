import { DynamoDB } from 'aws-sdk'
import { get, has, isArray } from 'lodash'
import { QueryError } from '../errors'
import * as Metadata from '../metadata'
import { ITable, Table } from '../table'
import { TableProperties } from '../tables/properties'
import { batchGet } from './batch-get'
import { batchWrite } from './batch-write'
import { buildQueryExpression } from './expression'
import { Filters as QueryFilters, UpdateConditions } from './filters'
import { QueryOutput } from './output'

type PrimaryKeyType = string | number | Date
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type RangePrimaryKeyType = PrimaryKeyType | void

type PrimaryKeyBatchInput<HashKeyType extends PrimaryKeyType, RangeKeyType extends RangePrimaryKeyType> = [HashKeyType, RangeKeyType]

interface PrimaryKeyGetInput<HashKeyType extends PrimaryKeyType, RangeKeyType extends RangePrimaryKeyType> {
  hash: HashKeyType
  range: RangeKeyType
  projectionExpression?: DynamoDB.ProjectionExpression
  consistent?: DynamoDB.ConsistentRead
  returnConsumedCapacity?: DynamoDB.ReturnConsumedCapacity
}

interface PrimaryKeyQueryInput {
  rangeOrder?: 'ASC' | 'DESC'
  limit?: number
  exclusiveStartKey?: DynamoDB.Key
  consistent?: boolean
}

interface PrimaryKeyUpdateItem<T extends Table, HashKeyType extends PrimaryKeyType, RangeKeyType extends RangePrimaryKeyType> {
  hash: HashKeyType
  range: RangeKeyType
  changes: TableProperties<T>
  conditions?: UpdateConditions<T>
}

export class PrimaryKey<T extends Table, HashKeyType extends PrimaryKeyType, RangeKeyType extends RangePrimaryKeyType> {
  constructor(
    readonly table: ITable<T>,
    readonly metadata: Metadata.Index.PrimaryKey,
  ) {}

  public getDeleteItemInput(hash: HashKeyType, range: RangeKeyType): DynamoDB.DeleteItemInput {
    const input: DynamoDB.DeleteItemInput = {
      TableName: this.table.schema.name,
      // ReturnValues: "ALL_OLD",
      Key: {
        [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(hash),
      },
    }

    if (this.metadata.range != null) {
      input.Key[this.metadata.range.name] = this.metadata.range.toDynamoAssert(range)
    }

    return input
  }

  public async delete(hash: HashKeyType, range: RangeKeyType): Promise<DynamoDB.Types.DeleteItemOutput> {
    const input = this.getDeleteItemInput(hash, range)
    return await this.table.schema.dynamo.deleteItem(input).promise()
  }

  public getGetItemInput(input: PrimaryKeyGetInput<HashKeyType, RangeKeyType>): DynamoDB.GetItemInput {
    const getItemInput: DynamoDB.GetItemInput = {
      TableName: this.table.schema.name,
      Key: {
        [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(input.hash),
      },
      ProjectionExpression: input.projectionExpression,
      ConsistentRead: input.consistent,
      ReturnConsumedCapacity: input.returnConsumedCapacity,
    }

    if (this.metadata.range != null && input.range != null) {
      getItemInput.Key[this.metadata.range.name] = this.metadata.range.toDynamoAssert(input.range)
    }

    return getItemInput
  }

  public async get(hash: HashKeyType, range: RangeKeyType): Promise<T | undefined> {
    const getItemInput = this.getGetItemInput({ hash, range })
    const dynamoRecord = await this.table.schema.dynamo.getItem(getItemInput).promise()
    if (dynamoRecord.Item != null) {
      return this.table.fromDynamo(dynamoRecord.Item)
    }
  }

  public async getItem(input: PrimaryKeyGetInput<HashKeyType, RangeKeyType>): Promise<T | undefined> {
    const getItemInput = this.getGetItemInput(input)
    const dynamoRecord = await this.table.schema.dynamo.getItem(getItemInput).promise()
    if (dynamoRecord.Item != null) {
      return this.table.fromDynamo(dynamoRecord.Item)
    }
  }

  public async batchGet(inputs: Array<PrimaryKeyBatchInput<HashKeyType, RangeKeyType>>): Promise<T[]> {
    const res = await batchGet(
      this.table.schema.dynamo,
      this.table.schema.name,
      inputs.map((input) => {
        const key: DynamoDB.Key = {
          [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(input[0]),
        }

        if (this.metadata.range != null) {
          key[this.metadata.range.name] = this.metadata.range.toDynamoAssert(input[1])
        }

        return key
      }),
    )

    const records = res.map((item) => {
      return this.table.fromDynamo(item)
    })

    return records
  }

  public async batchDelete(inputs: Array<PrimaryKeyBatchInput<HashKeyType, RangeKeyType>>): Promise<DynamoDB.BatchWriteItemOutput> {
    return await batchWrite(
      this.table.schema.dynamo,
      inputs.map((input) => {
        const deleteRequest: DynamoDB.DeleteRequest = {
          Key: {
            [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(input[0]),
          },
        }

        if (this.metadata.range != null) {
          deleteRequest.Key[this.metadata.range.name] = this.metadata.range.toDynamoAssert(input[1])
        }

        const writeRequest: DynamoDB.WriteRequest = {
          DeleteRequest: deleteRequest,
        }

        const requestMap: DynamoDB.BatchWriteItemRequestMap = {
          [this.table.schema.name]: [writeRequest],
        }

        return requestMap
      }),
    )
  }

  public getQueryInput(input: PrimaryKeyQueryInput = {}): DynamoDB.QueryInput {
    if (input.rangeOrder == null) {
      input.rangeOrder = 'ASC'
    }
    const ScanIndexForward = input.rangeOrder === 'ASC'
    const queryInput: DynamoDB.QueryInput = {
      TableName: this.table.schema.name,
      Limit: input.limit,
      ScanIndexForward,
      ExclusiveStartKey: input.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      ConsistentRead: input.consistent,
    }

    return queryInput
  }

  public async query(filters: QueryFilters<T>, input?: PrimaryKeyQueryInput): Promise<QueryOutput<T>> {
    if (!has(filters, this.metadata.hash.propertyName)) {
      throw new QueryError('Cannot perform a query on the PrimaryKey index without specifying a hash key value')
    } else if (isArray(get(filters, this.metadata.hash.propertyName)) && get(filters, this.metadata.hash.propertyName)[0] !== '=') {
      throw new QueryError('DynamoDB only supports using equal operator for the HASH key')
    }

    const queryInput = this.getQueryInput(input)
    const expression = buildQueryExpression(this.table.schema, filters, this.metadata)
    queryInput.FilterExpression = expression.FilterExpression
    queryInput.KeyConditionExpression = expression.KeyConditionExpression
    queryInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
    queryInput.ExpressionAttributeValues = expression.ExpressionAttributeValues

    const output = await this.table.schema.dynamo.query(queryInput).promise()
    return QueryOutput.fromDynamoOutput(this.table, output)
  }

  public async scan(options: {
    limit?: number
    totalSegments?: number
    segment?: number
    exclusiveStartKey?: DynamoDB.DocumentClient.Key
  } = {}): Promise<QueryOutput<T>> {
    const params: DynamoDB.DocumentClient.ScanInput = {
      TableName: this.table.schema.name,
      Limit: options.limit,
      ExclusiveStartKey: options.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      TotalSegments: options.totalSegments,
      Segment: options.segment,
    }

    const output = await this.table.schema.dynamo.scan(params).promise()
    return QueryOutput.fromDynamoOutput(this.table, output)
  }

  /**
   * Creates an instance of Table based on the key.
   *
   * Internally the record will be marked as existing, so when performing a .save() operation
   * it will use an UpdateItem operation which will only transmit the updated fields.
   *
   * This can lead to race conditions if not used properly. Try to use with save conditions.
   */
  public fromKey(hash: HashKeyType, range: RangeKeyType): T {
    const keyMap: DynamoDB.AttributeMap = {
      [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(hash),
    }

    if (this.metadata.range != null) {
      keyMap[this.metadata.range.name] = this.metadata.range.toDynamoAssert(range)
    }

    return this.table.fromDynamo(keyMap)
  }

  /**
   * This will create a temporary Table instance, then calls record.fromJSON() passing your requested changes.
   * record.fromJSON() handles setting and deleting attributes.
   *
   * It then has the Table.Schema build the DynamoDB.UpdateItemInput with all the requested changes.
   */
  public async update(input: PrimaryKeyUpdateItem<T, HashKeyType, RangeKeyType>): Promise<void> {
    return await this.fromKey(input.hash, input.range).fromJSON(input.changes).save(input.conditions)
  }
}
