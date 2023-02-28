import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { IAttributeType } from '../../interfaces'
import { BinaryAttributeMetadata } from '../../metadata/attribute-types/binary.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Value = Uint8Array
type Metadata = BinaryAttributeMetadata

export class BinaryAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.Binary
}
