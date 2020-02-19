import { DynamoDB } from 'aws-sdk'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { ValidationError } from '../../errors'
import { IAttributeType } from '../../interfaces/attribute-type.interface'
import { NumberAttributeMetadata } from '../../metadata/attribute-types/number.metadata'
import { AttributeType } from '../../tables/attribute-type'
import { numberToString, stringToNumber } from './utils'

type Value = number | BigInt
type Metadata = NumberAttributeMetadata

export class NumberAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.Number

  toDynamo(value: Value) {
    const type = typeof value
    if (type !== 'number' && type !== 'bigint') {
      throw new ValidationError(`Expected ${this.propertyName} to be a number, but was given a ${type}`)
    }

    return {
      N: numberToString(value),
    }
  }

  fromDynamo(value: DynamoDB.AttributeValue) {
    return stringToNumber(value.N as string)
  }
}
