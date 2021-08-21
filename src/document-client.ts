import { DynamoDB } from 'aws-sdk'
import { HelpfulError } from './errors'
import { batchWrite } from './query/batch-write'
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

  public getPutInput(record: T, params?: PutItemInputParams<T>): DynamoDB.PutItemInput {
    const input: DynamoDB.PutItemInput = {
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

  public async put(record: T, params?: PutItemInputParams<T>): Promise<DynamoDB.PutItemOutput> {
    const input = this.getPutInput(record, params)
    try {
      return await this.tableClass.schema.dynamo.putItem(input).promise()
    } catch (ex) {
      throw new HelpfulError(ex, this.tableClass, input)
    }
  }

  public getUpdateInput(record: T, params?: UpdateItemInputParams<T>): DynamoDB.UpdateItemInput {
    return getUpdateItemInput(record, params)
  }

  public async update(record: T, params?: UpdateItemInputParams<T>): Promise<DynamoDB.UpdateItemOutput> {
    const input = this.getUpdateInput(record, params)
    try {
      return await this.tableClass.schema.dynamo.updateItem(input).promise()
    } catch (ex) {
      throw new HelpfulError(ex, this.tableClass, input)
    }
  }

  public async batchPut(records: T[]): Promise<DynamoDB.BatchWriteItemOutput> {
    return await batchWrite(
      this.tableClass.schema.dynamo,
      records.map((record) => {
        const request: DynamoDB.BatchWriteItemRequestMap = {
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

  public getDeleteInput(record: T, conditions?: UpdateConditions<T>): DynamoDB.DeleteItemInput {
    const input: DynamoDB.DeleteItemInput = {
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

  public async transactPut(records: T[]): Promise<DynamoDB.TransactWriteItemsOutput> {
    return await transactWrite(
      this.tableClass.schema.dynamo,
      records.map((record) => {
        const writeRequest: DynamoDB.TransactWriteItem = {
          Put: {
            TableName: this.tableClass.schema.name,
            Item: record.toDynamo(),
          },
        }
        return writeRequest
      }),
    )
  }

  public async delete(record: T, conditions?: UpdateConditions<T>): Promise<DynamoDB.DeleteItemOutput> {
    return await new Promise((resolve, reject) => {
      const input = this.getDeleteInput(record, conditions)
      this.tableClass.schema.dynamo.deleteItem(input, (err, output) => {
        if (err != null) {
          reject(err)
        } else {
          resolve(output)
        }
      })
    })
  }
}
