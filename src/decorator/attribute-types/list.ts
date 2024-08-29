import type { AttributeValue } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

import { DynamoAttributeType } from '../../dynamo-attribute-types'
import type { ListAttributeMetadata } from '../../metadata/attribute-types/list.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Value = any[]
type Metadata = ListAttributeMetadata

export class ListAttributeType extends AttributeType<Value, Metadata> {
  type = DynamoAttributeType.List

  toDynamo(value: Value): AttributeValue {
    return marshall({ value }, this.metadata?.marshallOptions).value
  }

  fromDynamo(value: AttributeValue | null): Value | null {
    return value == null
      ? null
      : unmarshall({ value }, this.metadata?.unmarshallOptions).value
  }
}
