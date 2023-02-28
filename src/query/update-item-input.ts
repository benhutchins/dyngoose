import { ReturnConsumedCapacity, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb'
import * as _ from 'lodash'
import { AttributeMap, DynamoReturnValues } from '../interfaces'
import { Table } from '../table'
import { buildQueryExpression } from './expression'
import { UpdateConditions } from './filters'

export interface UpdateItemInputParams<T extends Table> {
  conditions?: UpdateConditions<T>
  returnValues?: DynamoReturnValues
  returnConsumedCapacity?: ReturnConsumedCapacity
}

interface UpdateItemInput extends UpdateItemCommandInput {
  UpdateExpression: string
}

export function getUpdateItemInput<T extends Table>(record: T, params?: UpdateItemInputParams<T>): UpdateItemInput {
  const tableClass = (record.constructor as typeof Table)
  const input: UpdateItemCommandInput = {
    TableName: tableClass.schema.name,
    Key: record.getDynamoKey(),
    ReturnValues: params?.returnValues ?? 'NONE',
  }

  if (params?.returnConsumedCapacity != null) {
    input.ReturnConsumedCapacity = params.returnConsumedCapacity
  }

  const sets: string[] = []
  const removes: string[] = []
  const attributeNameMap: Record<string, string> = {}
  const attributeValueMap: AttributeMap = {}

  let valueCounter = 0

  // we call toDynamo to have the record self-check for any dynamic attributes
  record.toDynamo()

  _.each(_.uniq(record.getUpdatedAttributes()), (attributeName, i) => {
    const attribute = tableClass.schema.getAttributeByName(attributeName)
    const value = attribute.toDynamo(record.getAttribute(attributeName))
    const operator = record.getUpdateOperator(attributeName)
    const slug = `#UA${valueCounter}`

    if (value != null) {
      attributeNameMap[slug] = attributeName
      attributeValueMap[`:u${valueCounter}`] = value

      switch (operator) {
        // Number attribute operators
        case 'increment': sets.push(`${slug} = ${slug} + :u${valueCounter}`); break
        case 'decrement': sets.push(`${slug} = ${slug} - :u${valueCounter}`); break

        // List attribute operators
        case 'append': sets.push(`${slug} = list_append(${slug}, :u${valueCounter})`); break
        case 'if_not_exists': sets.push(`${slug} = if_not_exists(${slug}, :u${valueCounter})`); break

        case 'set':
        default: sets.push(`${slug} = :u${valueCounter}`); break
      }

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
