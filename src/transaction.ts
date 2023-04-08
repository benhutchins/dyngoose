import { type Delete, type DynamoDB, type Put, type TransactWriteItem, type TransactWriteItemsOutput } from '@aws-sdk/client-dynamodb'
import Config from './config'
import { buildQueryExpression } from './query/expression'
import { type UpdateConditions } from './query/filters'
import { transactWrite } from './query/transact-write'
import { getUpdateItemInput } from './query/update-item-input'
import { type Table } from './table'

export class Transaction {
  private dynamo: DynamoDB
  private readonly list: TransactWriteItem[] = []

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
   *
   * **WARNING** Dyngoose will internally chunk your requested write items if you attempt to write more than
   *   the DynamoDB limit of 25 items per transactions, however, when doing so Dyngoose cannot guarantee this
   *   operation will be entirely atomic and you should avoid specifying more than 25 items.
   *
   * @param {DynamoDB} connection You can optionally specify the DynamoDB connection to utilize.
   * @see {@link https://github.com/benhutchins/dyngoose/blob/master/docs/Connections.md}.
   */
  constructor(connection?: DynamoDB) {
    this.dynamo = connection == null ? Config.defaultConnection.client : connection
  }

  public setConnection(dynamo: DynamoDB): this {
    this.dynamo = dynamo
    return this
  }

  /**
   * Add a record to be saved to this transaction.
   *
   * If the record already exists, Dyngoose will automatically use `.update()` to only
   * transmit the updated values of the record. It is highly recommended you specify
   * update conditions when updating existing items.
  */
  public save<T extends Table>(record: T, conditions?: UpdateConditions<T>): this {
    if (record.getSaveOperation() === 'put') {
      return this.put(record, conditions)
    } else {
      return this.update(record, conditions)
    }
  }

  public put<T extends Table>(record: T, conditions?: UpdateConditions<T>): this {
    const tableClass = record.constructor as typeof Table
    const put: Put = {
      TableName: tableClass.schema.name,
      Item: record.toDynamo(),
    }

    if (conditions != null) {
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
    const updateInput = getUpdateItemInput(record, { conditions })

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
    const del: Delete = {
      TableName: tableClass.schema.name,
      Key: record.getDynamoKey(),
    }

    if (conditions != null) {
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

  public async commit(): Promise<TransactWriteItemsOutput> {
    return await transactWrite(this.dynamo, this.list)
  }
}
