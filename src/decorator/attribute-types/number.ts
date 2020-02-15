import { DynamoDB } from 'aws-sdk'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { IAttributeType } from '../../interfaces/attribute-type.interface'
import { NumberAttributeMetadata } from '../../metadata/attribute-types/number.metadata'
import { AttributeType } from '../../tables/attribute-type'
import { numberToString, stringToNumber } from './utils'

type Value = number
type Metadata = NumberAttributeMetadata

export class NumberAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.Number

  toDynamo(value: Value) {
    return {
      N: numberToString(value),
    }
  }

  fromDynamo(value: DynamoDB.AttributeValue) {
    return stringToNumber(value.N as string)
  }
}
