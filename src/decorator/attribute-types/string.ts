import { DynamoDB } from 'aws-sdk'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { IAttributeType } from '../../interfaces/attribute-type.interface'
import { StringAttributeMetadata } from '../../metadata/attribute-types/string.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Value = DynamoDB.StringAttributeValue
type Metadata = StringAttributeMetadata

export class StringAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.String
}
