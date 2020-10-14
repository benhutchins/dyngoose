import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import Config from './config'
import { buildQueryExpression } from './query/expression'
import { UpdateConditions } from './query/filters'
import { transactWrite } from './query/transact-write'
import { getUpdateItemInput } from './query/update-item-input'
import { Table } from './table'

export class Transaction {
  private dynamo: DynamoDB
  private list: DynamoDB.TransactWriteItemList = []

  /**
   * Perform a Transaction operation.
   *
   * @see {@link https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html}
   *
   * Transaction operations are a synchronous write operation which can perform put, update, and delete actions
   * can target items in different tables, but not in different AWS accounts or Regions, and no two actions can
   * target the same item.
   *
   * To perform a non-atomic operation, use `Dyngoose.Batch`.

   * @param {DynamoDB} connection You can optionally specify the DynamoDB connection to utilize.
   * @see {@link https://github.com/benhutchins/dyngoose/blob/master/docs/Connections.md}.
   */
  constructor(connection?: DynamoDB) {
    this.dynamo = connection || Config.defaultConnection.client
  }

  public setConnection(dynamo: DynamoDB) {
    this.dynamo = dynamo
    return this
  }

  public save<T extends Table>(record: T, conditions?: UpdateConditions<T>): this {
    if (record.getSaveOperation() === 'put') {
      return this.put(record, conditions)
    } else {
      return this.update(record, conditions)
    }
  }

  public put<T extends Table>(record: T, conditions?: UpdateConditions<T>): this {
    const tableClass = record.constructor as typeof Table
    const put: DynamoDB.Put = {
      TableName: tableClass.schema.name,
      Item: record.toDynamo(),
    }

    if (conditions) {
      const conditionExpression = buildQueryExpression(tableClass.schema, conditions)
      put.ConditionExpression = conditionExpression.FilterExpression
      put.ExpressionAttributeNames = conditionExpression.ExpressionAttributeNames
      put.ExpressionAttributeValues = conditionExpression.ExpressionAttributeValues
    }

    this.list.push({
      Put: put,
    })

    return this
  }

  public update<T extends Table>(record: T, conditions?: UpdateConditions<T>): this {
    const tableClass = record.constructor as typeof Table
    const updateInput = getUpdateItemInput(record, conditions)

    this.list.push({
      Update: {
        TableName: tableClass.schema.name,
        Key: updateInput.Key,
        UpdateExpression: updateInput.UpdateExpression,
        ConditionExpression: updateInput.ConditionExpression,
        ExpressionAttributeNames: updateInput.ExpressionAttributeNames,
        ExpressionAttributeValues: updateInput.ExpressionAttributeValues,
      },
    })

    return this
  }

  public delete<T extends Table>(record: T, conditions?: UpdateConditions<T>): this {
    const tableClass = record.constructor as typeof Table
    const del: DynamoDB.Delete = {
      TableName: tableClass.schema.name,
      Key: record.getDynamoKey(),
    }

    if (conditions) {
      const conditionExpression = buildQueryExpression(tableClass.schema, conditions)
      del.ConditionExpression = conditionExpression.FilterExpression
      del.ExpressionAttributeNames = conditionExpression.ExpressionAttributeNames
      del.ExpressionAttributeValues = conditionExpression.ExpressionAttributeValues
    }

    this.list.push({
      Delete: del,
    })

    return this
  }

  public conditionCheck<T extends Table>(record: T, conditions: UpdateConditions<T>): this {
    const tableClass = record.constructor as typeof Table
    const conditionExpression = buildQueryExpression(tableClass.schema, conditions)

    this.list.push({
      ConditionCheck: {
        TableName: tableClass.schema.name,
        Key: record.getDynamoKey(),
        ConditionExpression: conditionExpression.FilterExpression as string,
        ExpressionAttributeNames: conditionExpression.ExpressionAttributeNames,
        ExpressionAttributeValues: conditionExpression.ExpressionAttributeValues,
      },
    })

    return this
  }

  public async commit() {
    return await transactWrite(this.dynamo, this.list)
  }
}
