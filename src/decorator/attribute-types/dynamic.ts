import { type AttributeValue } from '@aws-sdk/client-dynamodb'
import { type IAttributeType } from '../../interfaces'
import { type DynamicAttributeValue, type DynamicAttributeMetadata } from '../../metadata/attribute-types/dynamic.metadata'
import { type Table } from '../../table'
import { AttributeType } from '../../tables/attribute-type'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { DynamoAttributeType } from '../../dynamo-attribute-types'

export class DynamicAttributeType extends AttributeType<DynamicAttributeValue, DynamicAttributeMetadata>
  implements IAttributeType<DynamicAttributeValue> {
  /**
   * Dynamic types can be any type, but we set it to string.
   * This is really only used when creating indexes and the type needs to be specified.
  */
  type = DynamoAttributeType.String

  constructor(record: Table, propertyName: string, protected metadata?: DynamicAttributeMetadata) {
    super(record, propertyName, metadata)
  }

  toDynamo(value: DynamicAttributeValue): AttributeValue {
    const marshallOptions = {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      ...this.metadata?.marshallOptions ?? {},
    }

    return marshall({ value }, marshallOptions).value
  }

  fromDynamo(attributeValue: AttributeValue): DynamicAttributeValue {
    return unmarshall({ value: attributeValue }, this.metadata?.unmarshallOptions).value
  }
}
