import { DynamoDB } from 'aws-sdk'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { IAttributeType } from '../../interfaces/attribute-type.interface'
import { BinaryAttributeMetadata } from '../../metadata/attribute-types/binary.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Value = DynamoDB.BinaryAttributeValue
type Metadata = BinaryAttributeMetadata

export class BinaryAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.Binary
}
