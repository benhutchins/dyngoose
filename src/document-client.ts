import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import { batchWrite } from './query/batch_write'
import {transactWrite} from './query/transact_write'
import { buildQueryExpression } from './query/expression'
import { UpdateConditions } from './query/filters'
import { ITable, Table } from './table'

export class DocumentClient<T extends Table> {
  constructor(private tableClass: ITable<T>) {
  }

  public getPutInput(record: T, conditions?: UpdateConditions<T>): DynamoDB.PutItemInput {
    const input: DynamoDB.PutItemInput = {
      TableName: this.tableClass.schema.name,
      Item: record.toDynamo(),
    }

    if (conditions) {
      const conditionExpression = buildQueryExpression(this.tableClass.schema, conditions)
      input.ConditionExpression = conditionExpression.FilterExpression
      input.ExpressionAttributeNames = conditionExpression.ExpressionAttributeNames
      input.ExpressionAttributeValues = conditionExpression.ExpressionAttributeValues
    }

    return input
  }

  public async put(record: T, conditions?: UpdateConditions<T>): Promise<DynamoDB.PutItemOutput> {
    const input = this.getPutInput(record, conditions)
    const output = this.tableClass.schema.dynamo.putItem(input).promise()
    return output
  }

  public getUpdateInput(record: T, conditions?: UpdateConditions<T>): DynamoDB.UpdateItemInput {
    const input: DynamoDB.UpdateItemInput = {
      TableName: this.tableClass.schema.name,
      Key: record.getDynamoKey(),
      ReturnValues: 'NONE', // we don't need to get back what we just set
    }

    const sets: string[] = []
    const removes: string[] = []
    const attributeNameMap: DynamoDB.ExpressionAttributeNameMap = {}
    const attributeValueMap: DynamoDB.ExpressionAttributeValueMap = {}

    let valueCounter = 0

    // we call toDynamo to have the record self-check for any dynamic attributes
    record.toDynamo()

    _.each(_.uniq(record.getUpdatedAttributes()), (attributeName, i) => {
      const attribute = this.tableClass.schema.getAttributeByName(attributeName)
      const value = attribute.toDynamo(record.getAttribute(attributeName))
      const slug = '#UA' + valueCounter

      if (value) {
        attributeNameMap[slug] = attributeName
        attributeValueMap[`:u${valueCounter}`] = value
        sets.push(`${slug} = :u${valueCounter}`)
        valueCounter++
      }
    })

    _.each(_.uniq(record.getDeletedAttributes()), (attrName, i) => {
      const slug = '#DA' + valueCounter
      attributeNameMap[slug] = attrName
      removes.push(slug)
      valueCounter++
    })

    let updateExpression = ''

    if (sets.length > 0) {
      updateExpression += 'SET ' + sets.join(', ')
    }

    if (removes.length > 0) {
      if (updateExpression.length > 0) {
        updateExpression += ' '
      }

      updateExpression += 'REMOVE ' + removes.join(', ')
    }

    if (conditions) {
      const conditionExpression = buildQueryExpression(this.tableClass.schema, conditions)
      input.ConditionExpression = conditionExpression.FilterExpression
      Object.assign(attributeNameMap, conditionExpression.ExpressionAttributeNames)
      Object.assign(attributeValueMap, conditionExpression.ExpressionAttributeValues)
    }

    input.ExpressionAttributeNames = attributeNameMap
    input.UpdateExpression = updateExpression

    if (_.size(attributeValueMap) > 0) {
      input.ExpressionAttributeValues = attributeValueMap
    }

    return input
  }

  public async update(record: T, conditions?: UpdateConditions<T>): Promise<DynamoDB.UpdateItemOutput> {
    const input = this.getUpdateInput(record, conditions)
    const output = this.tableClass.schema.dynamo.updateItem(input).promise()
    return output
  }

  public async batchPut(records: T[]) {
    return await batchWrite(
      this.tableClass.schema.dynamo,
      this.tableClass.schema.name,
      records.map((record) => {
        const writeRequest: DynamoDB.WriteRequest = {
          PutRequest: {
            Item: record.toDynamo(),
          },
        }

        return writeRequest
      }),
    )
  }

  public getDeleteInput(record: T, conditions?: UpdateConditions<T>): DynamoDB.DeleteItemInput {
    const input: DynamoDB.DeleteItemInput = {
      TableName: this.tableClass.schema.name,
      Key: record.getDynamoKey(),
    }

    if (conditions) {
      const conditionExpression = buildQueryExpression(this.tableClass.schema, conditions)
      input.ConditionExpression = conditionExpression.FilterExpression
      input.ExpressionAttributeNames = conditionExpression.ExpressionAttributeNames
      input.ExpressionAttributeValues = conditionExpression.ExpressionAttributeValues
    }

    return input
  }

  public async transactPut(records: T[]) {
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
    return new Promise((resolve, reject) => {
      const input = this.getDeleteInput(record, conditions)
      this.tableClass.schema.dynamo.deleteItem(input, (err, output) => {
        if (err) {
          reject(err)
        } else {
          resolve(output)
        }
      })
    })
  }
}

