import { type AttributeValue } from '@aws-sdk/client-dynamodb'
import { trim } from 'lodash'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { ValidationError } from '../../errors'
import { type IAttributeType } from '../../interfaces'
import { type StringAttributeMetadata } from '../../metadata/attribute-types/string.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Value = string
type Metadata = StringAttributeMetadata

export class StringAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.String

  toDynamo(value: Value): AttributeValue {
    if (typeof value !== 'string') {
      throw new ValidationError(`Expected ${this.propertyName} to be a string, but was given a ${typeof value}`)
    }

    if (this.metadata?.trim === true) {
      value = trim(value)

      if (value === '') {
        return {
          NULL: true,
        }
      }
    }

    if (this.metadata?.uppercase === true) {
      value = value.toUpperCase()
    } else if (this.metadata?.lowercase === true) {
      value = value.toLowerCase()
    }

    return {
      S: value,
    }
  }
}
