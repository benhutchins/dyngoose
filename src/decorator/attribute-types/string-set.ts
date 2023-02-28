import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { IAttributeType } from '../../interfaces'
import { StringSetAttributeMetadata } from '../../metadata/attribute-types/string-set.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Value = string[]
type Metadata = StringSetAttributeMetadata

export class StringSetAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.StringSet
}
