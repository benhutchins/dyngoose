import type { AttributeValue } from '@aws-sdk/client-dynamodb'

import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { ValidationError } from '../../errors'
import type { IAttributeType } from '../../interfaces'
import type { NumberAttributeMetadata } from '../../metadata/attribute-types/number.metadata'
import { AttributeType } from '../../tables/attribute-type'
import { isNumber, numberToString, stringToNumber } from '../../utils'

type Value = number | bigint
type Metadata = NumberAttributeMetadata

export class NumberAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.Number

  toDynamo(value: Value): AttributeValue {
    if (!isNumber(value)) {
      throw new ValidationError(`Expected ${this.propertyName} to be a number`)
    }

    return {
      N: numberToString(value),
    }
  }

  fromDynamo(value: AttributeValue): Value | null {
    if (value.N == null) {
      return null
    } else {
      return stringToNumber(value.N)
    }
  }
}
