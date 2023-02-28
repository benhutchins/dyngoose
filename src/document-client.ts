import {
  DeleteItemInput,
  TransactWriteItem,
  TransactWriteItemsOutput,
  BatchWriteItemOutput,
  UpdateItemInput,
  PutItemInput,
  UpdateItemCommandOutput,
  PutItemCommandOutput,
  DeleteItemCommandOutput,
} from '@aws-sdk/client-dynamodb'
import { HelpfulError } from './errors'
import { batchWrite, WriteRequestMap } from './query/batch-write'
import { buildQueryExpression } from './query/expression'
import { UpdateConditions } from './query/filters'
import { transactWrite } from './query/transact-write'
import { getUpdateItemInput, UpdateItemInputParams } from './query/update-item-input'
import { ITable, Table } from './table'

interface PutItemInputParams<T extends Table> extends UpdateItemInputParams<T> {
}

export class DocumentClient<T extends Table> {
  constructor(private readonly tableClass: ITable<T>) {
  }

  public getPutInput(record: T, params?: PutItemInputParams<T>): PutItemInput {
    const input: PutItemInput = {
      TableName: this.tableClass.schema.name,
      Item: record.toDynamo(),
    }

    if (params?.returnValues != null) {
      input.ReturnValues = params.returnValues
    }

    if (params?.conditions != null) {
      const conditionExpression = buildQueryExpression(this.tableClass.schema, params.conditions)
      input.ConditionExpression = conditionExpression.FilterExpression
      input.ExpressionAttributeNames = conditionExpression.ExpressionAttributeNames
      input.ExpressionAttributeValues = conditionExpression.ExpressionAttributeValues
    }

    return input
  }

  public async put(record: T, params?: PutItemInputParams<T>): Promise<PutItemCommandOutput> {
    const input = this.getPutInput(record, params)
    try {
      return await this.tableClass.schema.dynamo.putItem(input)
    } catch (ex) {
      throw new HelpfulError(ex, this.tableClass, input)
    }
  }

  public getUpdateInput(record: T, params?: UpdateItemInputParams<T>): UpdateItemInput {
    return getUpdateItemInput(record, params)
  }

  public async update(record: T, params?: UpdateItemInputParams<T>): Promise<UpdateItemCommandOutput> {
    const input = this.getUpdateInput(record, params)
    try {
      return await this.tableClass.schema.dynamo.updateItem(input)
    } catch (ex) {
      throw new HelpfulError(ex, this.tableClass, input)
    }
  }

  public async batchPut(records: T[]): Promise<BatchWriteItemOutput> {
    return await batchWrite(
      this.tableClass.schema.dynamo,
      records.map((record) => {
        const request: WriteRequestMap = {
          [this.tableClass.schema.name]: [
            {
              PutRequest: {
                Item: record.toDynamo(),
              },
            },
          ],
        }

        return request
      }),
    )
  }

  public getDeleteInput(record: T, conditions?: UpdateConditions<T>): DeleteItemInput {
    const input: DeleteItemInput = {
      TableName: this.tableClass.schema.name,
      Key: record.getDynamoKey(),
    }

    if (conditions != null) {
      const conditionExpression = buildQueryExpression(this.tableClass.schema, conditions)
      input.ConditionExpression = conditionExpression.FilterExpression
      input.ExpressionAttributeNames = conditionExpression.ExpressionAttributeNames
      input.ExpressionAttributeValues = conditionExpression.ExpressionAttributeValues
    }

    return input
  }

  public async transactPut(records: T[]): Promise<TransactWriteItemsOutput> {
    return await transactWrite(
      this.tableClass.schema.dynamo,
      records.map((record) => {
        const writeRequest: TransactWriteItem = {
          Put: {
            TableName: this.tableClass.schema.name,
            Item: record.toDynamo(),
          },
        }
        return writeRequest
      }),
    )
  }

  public async delete(record: T, conditions?: UpdateConditions<T>): Promise<DeleteItemCommandOutput> {
    const input = this.getDeleteInput(record, conditions)
    try {
      return await this.tableClass.schema.dynamo.deleteItem(input)
    } catch (ex) {
      throw new HelpfulError(ex, this.tableClass, input)
    }
  }
}
