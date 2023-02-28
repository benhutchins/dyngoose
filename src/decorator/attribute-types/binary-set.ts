import { AttributeValue } from '@aws-sdk/client-dynamodb'
import { isArray, isSet } from 'lodash'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { ValidationError } from '../../errors'
import { IAttributeType } from '../../interfaces'
import { BinarySetAttributeMetadata, BinarySetValue } from '../../metadata/attribute-types/binary-set.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Metadata = BinarySetAttributeMetadata

export class BinarySetAttributeType extends AttributeType<BinarySetValue, Metadata> implements IAttributeType<BinarySetValue> {
  type = DynamoAttributeType.BinarySet

  toDynamo(values: BinarySetValue): AttributeValue {
    if (!isSet(values) && !isArray(values)) {
      throw new ValidationError(`Expected ${this.propertyName} to be an array of binary values`)
    }

    return {
      BS: Array.from(values),
    }
  }

  fromDynamo(value: AttributeValue.BSMember): BinarySetValue | null {
    // this needs to return null when there is no value, so the default value can be set if necessary
    // returning an empty array means there was a value from DynamoDB with a Set containing no items
    if (value.BS == null) {
      return null
    } else {
      const binarySet: BinarySetValue = new Set()
      value.BS.forEach((item) => {
        binarySet.add(item)
      })
      return binarySet
    }
  }
}
