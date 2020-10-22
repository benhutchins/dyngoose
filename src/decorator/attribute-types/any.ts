import { DynamoDB } from 'aws-sdk'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { IAttributeType } from '../../interfaces/attribute-type.interface'
import { AnyAttributeMetadata } from '../../metadata/attribute-types/any.metadata'
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

  fromDynamo(attributeValue: DynamoDB.AttributeValue): Value | null {
    try {
      return JSON.parse(attributeValue.S as string)
    } catch (ex) {
      return null
    }
  }
}
