import { type AttributeValue } from '@aws-sdk/client-dynamodb'
import { every, isArray, isSet, uniq } from 'lodash'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { ValidationError } from '../../errors'
import { type IAttributeType } from '../../interfaces'
import { type NumberSetAttributeMetadata, type NumberSetValue } from '../../metadata/attribute-types/number-set.metadata'
import { type NumberValue } from '../../metadata/attribute-types/number.metadata'
import { AttributeType } from '../../tables/attribute-type'
import { isNumber, numberToString, stringToNumber } from './utils'

type Metadata = NumberSetAttributeMetadata

export class NumberSetAttributeType extends AttributeType<NumberSetValue, Metadata> implements IAttributeType<NumberSetValue> {
  type = DynamoAttributeType.NumberSet

  toDynamo(values: NumberSetValue | NumberValue[] | NumberValue): AttributeValue {
    if (isNumber(values)) {
      return { NS: [numberToString(values)] }
    }

    if ((!isSet(values) && !isArray(values)) || !every(values, isNumber)) {
      throw new ValidationError(`Expected ${this.propertyName} to be an array of number values`)
    }

    return {
      NS: uniq(Array.from(values).map((value) => numberToString(value))),
    }
  }

  fromDynamo(value: AttributeValue): NumberSetValue | null {
    // this needs to return null when there is no value, so the default value can be set if necessary
    // returning an empty array means there was a value from DynamoDB with a Set containing no items
    if (value.NS == null) {
      return null
    } else {
      return this.fromJSON(value.NS)
    }
  }

  toJSON(values: NumberSetValue): NumberValue[] {
    return Array.from(values)
  }

  fromJSON(values: Array<string | number>): NumberSetValue {
    if (this.metadata?.array === true) {
      return values.map((item) => stringToNumber(item))
    } else {
      const numberSet: NumberSetValue = new Set()
      values.forEach((item) => {
        numberSet.add(stringToNumber(item))
      })
      return numberSet
    }
  }
}
