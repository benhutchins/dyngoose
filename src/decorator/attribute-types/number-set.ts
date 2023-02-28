import { AttributeValue } from '@aws-sdk/client-dynamodb'
import { every, isArray, uniq } from 'lodash'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { ValidationError } from '../../errors'
import { IAttributeType } from '../../interfaces'
import { NumberSetAttributeMetadata } from '../../metadata/attribute-types/number-set.metadata'
import { AttributeType } from '../../tables/attribute-type'
import { isNumber, numberToString, stringToNumber } from './utils'

type Value = Array<number | BigInt>
type Metadata = NumberSetAttributeMetadata

export class NumberSetAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.NumberSet

  toDynamo(values: Value): AttributeValue {
    if (!isArray(values) || !every(values, isNumber)) {
      throw new ValidationError(`Expected ${this.propertyName} to be an array of numbers`)
    }

    // dynamodb does not allow sets to contain duplicate values, so ensure uniqueness here
    return {
      NS: uniq(values.map((value) => numberToString(value))),
    }
  }

  fromDynamo(value: AttributeValue): Value | null {
    // this needs to return null when there is no value, so the default value can be set if necessary
    // returning an empty array means there was a value from DynamoDB with a Set containing no items
    if (value.NS == null) {
      return null
    } else {
      return value.NS.map((item) => stringToNumber(item))
    }
  }
}
