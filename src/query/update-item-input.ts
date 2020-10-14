import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import { Table } from '../table'
import { buildQueryExpression } from './expression'
import { UpdateConditions } from './filters'

interface UpdateItemInput extends DynamoDB.UpdateItemInput {
  UpdateExpression: string
}

export function getUpdateItemInput<T extends Table>(record: T, conditions?: UpdateConditions<T>): UpdateItemInput {
  const tableClass = (record.constructor as typeof Table)
  const input: DynamoDB.UpdateItemInput = {
    TableName: tableClass.schema.name,
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
    const attribute = tableClass.schema.getAttributeByName(attributeName)
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
    const conditionExpression = buildQueryExpression(tableClass.schema, conditions)
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
