import { AttributeValue } from 'aws-sdk/clients/dynamodb'
import { Attribute } from '../attribute'
import { DynamoAttributeTypes } from '../dynamo-attribute-types'

export interface IAttributeType<Value> {
  type: DynamoAttributeTypes

  /**
   * Convert this attribute from the AttributeValue's value to the desired Value.
   */
  fromDynamo: (attributeValue: AttributeValue, attribute: Attribute<Value>) => Value | null

  /**
   * Convert this attribute from the desired Value into a saveable value DynamoDB will accept.
   */
  toDynamo: (value: Value, attribute: Attribute<Value>) => AttributeValue

  /**
   * Apply the default
   */
  getDefault?: () => Value | null

  /**
   * When calling .toJSON() on a Table record, this method will be used to help
   * convert this attribute into an exportable format.
   */
  toJSON?: (value: any, attribute: Attribute<Value>) => any

  /**
   * When calling Table.fromJSON, this method will be used to help convert a given
   * value into an appropriate attribute value.
   */
  fromJSON?: (value: any) => Value
}
