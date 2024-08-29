import type { AttributeValue } from '@aws-sdk/client-dynamodb'

import { DynamoAttributeType } from '../../dynamo-attribute-types'
import type { IAttributeType } from '../../interfaces'
import type { AnyAttributeMetadata } from '../../metadata/attribute-types/any.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Value = any
type Metadata = AnyAttributeMetadata

export class AnyAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.String

  toDynamo(value: any): any {
    return {
      S: JSON.stringify(value),
    }
  }

  fromDynamo(attributeValue: AttributeValue): Value | null {
    try {
      return JSON.parse(attributeValue.S!)
    } catch (ex) {
      return null
    }
  }
}
