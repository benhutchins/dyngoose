import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import { DynamoReturnValues } from '../interfaces'
import { Table } from '../table'
import { buildQueryExpression } from './expression'
import { UpdateConditions } from './filters'

export interface UpdateItemInputParams<T extends Table> {
  conditions?: UpdateConditions<T>
  returnValues?: DynamoReturnValues
  returnConsumedCapacity?: DynamoDB.ReturnConsumedCapacity
}

interface UpdateItemInput extends DynamoDB.UpdateItemInput {
  UpdateExpression: string
}

export function getUpdateItemInput<T extends Table>(record: T, params?: UpdateItemInputParams<T>): UpdateItemInput {
  const tableClass = (record.constructor as typeof Table)
  const input: DynamoDB.UpdateItemInput = {
    TableName: tableClass.schema.name,
    Key: record.getDynamoKey(),
    ReturnValues: params?.returnValues ?? 'NONE',
  }

  if (params?.returnConsumedCapacity != null) {
    input.ReturnConsumedCapacity = params.returnConsumedCapacity
  }

  const sets: string[] = []
  const removes: string[] = []
  const attributeNameMap: DynamoDB.ExpressionAttributeNameMap = {}
  const attributeValueMap: DynamoDB.ExpressionAttributeValueMap = {}

  let valueCounter = 0

  // we call toDynamo to have the record self-check for any dynamic attributes
  record.toDynamo()

  _.each(_.uniq(record.getUpdatedAttributes()), (attributeName, i) => {
    const attribute = tableClass.schema.getAttributeByName(attributeName)
    const value = attribute.toDynamo(record.getAttribute(attributeName))
    const slug = `#UA${valueCounter}`

    if (value != null) {
      attributeNameMap[slug] = attributeName
      attributeValueMap[`:u${valueCounter}`] = value
      sets.push(`${slug} = :u${valueCounter}`)
      valueCounter++
    }
  })

  _.each(_.uniq(record.getDeletedAttributes()), (attrName, i) => {
    const slug = `#DA${valueCounter}`
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

  if (params?.conditions != null) {
    const conditionExpression = buildQueryExpression(tableClass.schema, params.conditions)
    input.ConditionExpression = conditionExpression.FilterExpression
    Object.assign(attributeNameMap, conditionExpression.ExpressionAttributeNames)
    Object.assign(attributeValueMap, conditionExpression.ExpressionAttributeValues)
  }

  input.ExpressionAttributeNames = attributeNameMap
  input.UpdateExpression = updateExpression

  if (_.size(attributeValueMap) > 0) {
    input.ExpressionAttributeValues = attributeValueMap
  }

  return input as UpdateItemInput
}
