import { type AttributeValue } from '@aws-sdk/client-dynamodb'
import { every, isArray, isSet, isString, uniq } from 'lodash'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { ValidationError } from '../../errors'
import { type IAttributeType } from '../../interfaces'
import { type StringSetAttributeMetadata, type StringSetValue } from '../../metadata/attribute-types/string-set.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Metadata = StringSetAttributeMetadata

export class StringSetAttributeType extends AttributeType<StringSetValue, Metadata> implements IAttributeType<StringSetValue> {
  type = DynamoAttributeType.StringSet

  toDynamo(values: StringSetValue | string[] | string): AttributeValue.SSMember {
    if (isString(values)) {
      return { SS: [values] }
    }

    if ((!isSet(values) && !isArray(values)) || !every(values, isString)) {
      throw new ValidationError(`Expected ${this.propertyName} to be a set of string values`)
    }

    return {
      SS: uniq(Array.from(values)),
    }
  }

  fromDynamo(value: AttributeValue.SSMember): StringSetValue | null {
    // this needs to return null when there is no value, so the default value can be set if necessary
    // returning an empty array means there was a value from DynamoDB with a Set containing no items
    if (value.SS == null) {
      return null
    } else {
      const stringSet: StringSetValue = new Set()
      value.SS.forEach((item) => {
        stringSet.add(item)
      })
      return stringSet
    }
  }
}
