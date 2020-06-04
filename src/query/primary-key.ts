import { DynamoDB } from 'aws-sdk'
import { get, has, isArray } from 'lodash'
import * as moment from 'moment'
import { QueryError } from '../errors'
import * as Metadata from '../metadata'
import { ITable, Table } from '../table'
import { TableProperties } from '../tables/properties'
import { batchGet } from './batch_get'
import { batchWrite } from './batch_write'
import { buildQueryExpression } from './expression'
import { Filters as QueryFilters } from './filters'
import { Results as QueryResults } from './results'

type PrimaryKeyType = string | number | Date | moment.Moment
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
}

export class PrimaryKey<T extends Table, HashKeyType extends PrimaryKeyType, RangeKeyType extends RangePrimaryKeyType> {
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

  public async get(hash: HashKeyType, range: RangeKeyType): Promise<T | void> {
    const getItemInput = this.getGetItemInput({ hash, range })
    const dynamoRecord = await this.table.schema.dynamo.getItem(getItemInput).promise()
    if (dynamoRecord.Item) {
      return this.table.fromDynamo(dynamoRecord.Item)
    }
  }

  public async getItem(input: PrimaryKeyGetInput<HashKeyType, RangeKeyType>): Promise<T | void> {
    const getItemInput = this.getGetItemInput(input)
    const dynamoRecord = await this.table.schema.dynamo.getItem(getItemInput).promise()
    if (dynamoRecord.Item) {
      return this.table.fromDynamo(dynamoRecord.Item)
    }
  }

  public async batchGet(inputs: PrimaryKeyBatchInput<HashKeyType, RangeKeyType>[]): Promise<Array<T>> {
    const res = await batchGet(
      this.table.schema.dynamo,
      this.table.schema.name,
      inputs.map((input) => {
        const key: DynamoDB.Key = {
          [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(input[0]),
        }

        if (this.metadata.range) {
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

  public async batchDelete(inputs: PrimaryKeyBatchInput<HashKeyType, RangeKeyType>[]) {
    return await batchWrite(
      this.table.schema.dynamo,
      this.table.schema.name,
      inputs.map((input) => {
        const deleteRequest: DynamoDB.DeleteRequest = {
          Key: {
            [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(input[0]),
          },
        }

        if (this.metadata.range) {
          deleteRequest.Key[this.metadata.range.name] = this.metadata.range.toDynamoAssert(input[1])
        }

        const request: DynamoDB.WriteRequest = {
          DeleteRequest: deleteRequest,
        }

        return request
      }),
    )
  }

  public getQueryInput(input: PrimaryKeyQueryInput = {}): DynamoDB.QueryInput {
    if (!input.rangeOrder) {
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

  public async query(filters: QueryFilters<T>, input?: PrimaryKeyQueryInput): Promise<QueryResults<T>> {
    if (!has(filters, this.metadata.hash.propertyName)) {
      throw new QueryError('Cannot perform a query on the PrimaryKey index without specifying a hash key value')
    } else if (isArray(get(filters, this.metadata.hash.propertyName)) &&
      (get(filters, this.metadata.hash.propertyName) as any)[0] !== '=') {
      throw new QueryError('DynamoDB only supports using equal operator for the HASH key')
    }

    const queryInput = this.getQueryInput(input)
    const expression = buildQueryExpression(this.table.schema, filters, this.metadata)
    queryInput.FilterExpression = expression.FilterExpression
    queryInput.KeyConditionExpression = expression.KeyConditionExpression
    queryInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
    queryInput.ExpressionAttributeValues = expression.ExpressionAttributeValues

    const output = await this.table.schema.dynamo.query(queryInput).promise()
    const records = (output.Items || []).map((item) => {
      return this.table.fromDynamo(item)
    })

    return {
      records,
      count: output.Count || records.length,
      scannedCount: output.ScannedCount as number,
      lastEvaluatedKey: output.LastEvaluatedKey,
      consumedCapacity: output.ConsumedCapacity as DynamoDB.ConsumedCapacity,
    }
  }

  public async scan(options: {
    limit?: number,
    totalSegments?: number,
    segment?: number,
    exclusiveStartKey?: DynamoDB.DocumentClient.Key,
  } = {}): Promise<QueryResults<T>> {
    const params: DynamoDB.DocumentClient.ScanInput = {
      TableName: this.table.schema.name,
      Limit: options.limit,
      ExclusiveStartKey: options.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      TotalSegments: options.totalSegments,
      Segment: options.segment,
    }

    const result = await this.table.schema.dynamo.scan(params).promise()
    const records = (result.Items || []).map((item) => {
      return this.table.fromDynamo(item)
    })

    return {
      records,
      count: result.Count || records.length,
      scannedCount: result.ScannedCount as number,
      lastEvaluatedKey: result.LastEvaluatedKey,
      consumedCapacity: result.ConsumedCapacity as DynamoDB.ConsumedCapacity,
    }
  }

  /**
   * This will create a temporary Table instance, then calls record.fromJSON() passing your requested changes.
   * record.fromJSON() handles setting and deleting attributes.
   *
   * It then has the Table.Schema build the DynamoDB.UpdateItemInput with all the requested changes.
   */
  public async update(input: PrimaryKeyUpdateItem<T, HashKeyType, RangeKeyType>): Promise<void> {
    const keyMap: DynamoDB.AttributeMap = {
      [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(input.hash),
    }

    if (this.metadata.range) {
      keyMap[this.metadata.range.name] = this.metadata.range.toDynamoAssert(input.range)
    }

    return this.table.fromDynamo(keyMap).fromJSON(input.changes).save()
  }
}
