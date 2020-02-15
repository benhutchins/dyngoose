import { AttributeValue } from 'aws-sdk/clients/dynamodb'
import { Attribute } from '../attribute'

export interface AttributeMetadata<Value> {
  name?: string // when not set, the attribute name defaults to the propertyName

  /**
   * Makes this a required field, attempting to save a record without this value
   * will throw an error.
   *
   * This is primarily useful to prevent mistakes. Not designed as a primary means
   * of input validation.
   */
  required?: boolean

  /**
   * Default value for this attribute.
   *
   * You can define a function that returns the default value.
   */
  default?: Value | (() => Value)

  /**
   * Manipulate the value whenever it is transformed into AttributeValue from Value
   */
  manipulateWrite?: (attributeValue: AttributeValue | null, value: Value | null, attribute: Attribute<any>) => AttributeValue | null

  /**
   * Manipulate the value whenever it is read from the AttributeValue into Value
   */
  manipulateRead?: (value: Value | null, attributeValue: AttributeValue, attribute: Attribute<any>) => Value | null

  validate?: (value: Value) => boolean
}
