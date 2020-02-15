import { DynamoDB } from 'aws-sdk'
import * as moment from 'moment'
import { Attribute } from '../attribute'

export type ConditionValueType = string | boolean | number | Date | moment.Moment | null | void

export type Condition<T extends ConditionValueType> = (
  ['=', T]
  | ['<>', T] // not equals
  | ['<', T]
  | ['<=', T]
  | ['>', T]
  | ['>=', T]
  | ['beginsWith', T]
  | ['between', T, T]
)

interface IParsedCondition {
  conditionExpression: string
  expressionAttributeValues: DynamoDB.AttributeMap
}

export function parseCondition<T extends ConditionValueType>(
  attribute: Attribute<any>,
  condition: Condition<T>,
  rangeKeyName: string,
): IParsedCondition {
  switch (condition [0]) {
    case '=':
    case '<>':
    case '<':
    case '<=':
    case '>':
    case '>=':
      return {
        conditionExpression: `${rangeKeyName} ${condition [0]} :rkv`,
        expressionAttributeValues: {
          ':rkv': attribute.toDynamoAssert(condition[1]),
        },
      }
    case 'beginsWith':
      return {
        conditionExpression: `begins_with(${rangeKeyName}, :rkv)`,
        expressionAttributeValues: {
          ':rkv': attribute.toDynamoAssert(condition[1]),
        },
      }
    case 'between':
      return {
        conditionExpression: `${rangeKeyName} between :rkv1 AND :rkv2`,
        expressionAttributeValues: {
          ':rkv1': attribute.toDynamoAssert(condition[1]),
          ':rkv2': attribute.toDynamoAssert(condition[2]),
        },
      }
  }
}
