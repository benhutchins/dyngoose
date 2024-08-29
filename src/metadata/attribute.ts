import type { AttributeValue } from '@aws-sdk/client-dynamodb'

import type { Attribute } from '../attribute'

export interface AttributeMetadata<Value> {
  /**
   * Name for this attribute.
   *
   * When not set, the attribute name defaults to the property name used on the Table.
   */
  name?: string

  /**
   * Optional extra data, used for your own logic.
   */
  extra?: any

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
  manipulateRead?: (value: Value | null, attributeValue: AttributeValue | null, attribute: Attribute<any>) => Value | null

  /**
   * Define custom validation logic.
   *
   * When the value is invalid, this function should throw an error.
   * Optionally, it can return false and Dyngoose will throw an `ValidationError`.
   */
  validate?: (value: Value) => boolean
}
