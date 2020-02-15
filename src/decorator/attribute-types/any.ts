import { DynamoDB } from 'aws-sdk'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { IAttributeType } from '../../interfaces/attribute-type.interface'
import { BinaryAttributeMetadata } from '../../metadata/attribute-types/binary.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Value = any
type Metadata = BinaryAttributeMetadata

export class AnyAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.String

  toDynamo(value: any) {
    return {
      S: JSON.stringify(value),
    }
  }

  fromDynamo(attributeValue: DynamoDB.AttributeValue) {
    try {
      return JSON.parse(attributeValue.S as string)
    } catch (ex) {
      return
    }
  }
}
