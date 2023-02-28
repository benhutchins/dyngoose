import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { IAttributeType } from '../../interfaces'
import { BinarySetAttributeMetadata } from '../../metadata/attribute-types/binary-set.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Value = Uint8Array[]
type Metadata = BinarySetAttributeMetadata

export class BinarySetAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.BinarySet
}
