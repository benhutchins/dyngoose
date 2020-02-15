import { DynamoDB } from 'aws-sdk'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { IAttributeType } from '../../interfaces/attribute-type.interface'
import { NumberSetAttributeMetadata } from '../../metadata/attribute-types/number-set.metadata'
import { AttributeType } from '../../tables/attribute-type'
import { numberToString, stringToNumber } from './utils'

type Value = number[]
type Metadata = NumberSetAttributeMetadata

export class NumberSetAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.NumberSet

  toDynamo(values: Value) {
    return {
      NS: values.map((value) => numberToString(value)),
    }
  }

  fromDynamo(value: DynamoDB.AttributeValue) {
    return (value.NS || []).map((item) => {
      return stringToNumber(item)
    })
  }
}
