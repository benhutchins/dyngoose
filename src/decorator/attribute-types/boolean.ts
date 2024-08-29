import { DynamoAttributeType } from '../../dynamo-attribute-types'
import type { IAttributeType } from '../../interfaces'
import type { BooleanAttributeMetadata, BooleanAttributeValue } from '../../metadata/attribute-types/boolean.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Value = BooleanAttributeValue
type Metadata = BooleanAttributeMetadata

export class BooleanAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.Boolean
}
