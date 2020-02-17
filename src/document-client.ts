import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import { batchWrite } from './query/batch_write'
import { ITable, Table } from './table'

export class DocumentClient<T extends Table> {
  constructor(private tableClass: ITable<T>) {
  }

  public getPutInput(record: T): DynamoDB.PutItemInput {
    return {
      TableName: this.tableClass.schema.name,
      Item: record.toDynamo(),
    }
  }

  public async put(record: T): Promise<DynamoDB.PutItemOutput> {
    const input = this.getPutInput(record)
    const output = this.tableClass.schema.dynamo.putItem(input).promise()
    return output
  }

  public getUpdateInput(record: T): DynamoDB.UpdateItemInput {
    const input: DynamoDB.UpdateItemInput = {
      TableName: this.tableClass.schema.name,
      Key: record.getDynamoKey(),
      ReturnValues: 'NONE', // we don't need to get back what we just set
    }

    const sets: string[] = []
    const removes: string[] = []
    const attributeNameMap: DynamoDB.ExpressionAttributeNameMap = {}
    const attrValues: DynamoDB.ExpressionAttributeValueMap = {}

    let valueCounter = 0

    // we call toDynamo to have the record self-check for any dynamic attributes
    record.toDynamo()

    _.each(_.uniq(record.getUpdatedAttributes()), (attributeName, i) => {
      const attribute = this.tableClass.schema.getAttributeByName(attributeName)
      const value = attribute.toDynamo(record.getAttribute(attributeName))
      const slug = '#A' + valueCounter

      if (value) {
        attributeNameMap[slug] = attributeName
        attrValues[`:v${valueCounter}`] = value
        sets.push(`${slug} = :v${valueCounter}`)
        valueCounter++
      }
    })

    _.each(_.uniq(record.getDeletedAttributes()), (attrName, i) => {
      const slug = '#D' + valueCounter
      attributeNameMap[slug] = attrName
      removes.push(slug)
      valueCounter++
    })

    let expression = ''

    if (sets.length > 0) {
      expression += 'SET ' + sets.join(', ')
    }

    if (removes.length > 0) {
      if (expression.length > 0) {
        expression += ' '
      }

      expression += 'REMOVE ' + removes.join(', ')
    }


    input.ExpressionAttributeNames = attributeNameMap
    input.UpdateExpression = expression

    if (_.size(attrValues) > 0) {
      input.ExpressionAttributeValues = attrValues
    }

    return input
  }

  public async update(record: T): Promise<DynamoDB.UpdateItemOutput> {
    const input = this.getUpdateInput(record)
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

  public getDeleteInput(record: T): DynamoDB.DeleteItemInput {
    return {
      TableName: this.tableClass.schema.name,
      Key: record.getDynamoKey(),
    }
  }

  public async delete(record: T): Promise<DynamoDB.DeleteItemOutput> {
    return new Promise((resolve, reject) => {
      const input = this.getDeleteInput(record)
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

