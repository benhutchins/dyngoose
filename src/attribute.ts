import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import { ValidationError } from './errors'
import { IAttributeType } from './interfaces/attribute-type.interface'
import { AttributeMetadata } from './metadata/attribute'
import { isTrulyEmpty } from './utils/truly-empty'

export class Attribute<Value> {
  public name: string

  // private get isSet(): boolean {
  //   return _.intersection(this.dynamoTypes, [
  //     AttributeType.BooleanSet,
  //     AttributeType.NumberSet,
  //     AttributeType.StringSet,
  //     AttributeType.List,
  //   ]).length > 0
  // }

  constructor(
    public readonly propertyName: string,
    public readonly type: IAttributeType<Value>,
    public metadata: AttributeMetadata<Value> = {},
  ) {
    this.name = this.metadata.name == null ? this.propertyName : this.metadata.name
  }

  /**
   * Set the default value for an attribute, if no value is currently set
   */
  getDefaultValue(): Value | null {
    if (typeof this.metadata.default !== 'undefined') {
      return _.isFunction(this.metadata.default) ? this.metadata.default() : this.metadata.default
    } else if (typeof this.type.getDefault === 'function') {
      return this.type.getDefault()
    } else {
      return null
    }
  }

  /**
   * Convert the given value for this attribute to a DynamoDB AttributeValue
   */
  toDynamo(value: Value | null): DynamoDB.AttributeValue | null {
    // if there is no value, inject the default value for this attribute
    if (value == null || isTrulyEmpty(value)) {
      return null
    }

    // if we have no value, allow the manipulateWrite a chance to provide a value
    if (typeof this.metadata.manipulateWrite === 'function' && value == null) {
      const customAttributeValue = this.metadata.manipulateWrite(null, null, this)

      if (customAttributeValue != null) {
        return customAttributeValue
      }
    }

    // if there is no value, do not not return an empty DynamoDB.AttributeValue
    if (value == null) {
      if (this.metadata.required === true) {
        throw new ValidationError('Required value missing: ' + this.name)
      }
      return null
    }

    if (typeof this.metadata.validate === 'function' && !this.metadata.validate(value)) {
      throw new ValidationError('Validation failed: ' + this.name)
    }

    const attributeValue = this.type.toDynamo(value, this)

    if (typeof this.metadata.manipulateWrite === 'function') {
      return this.metadata.manipulateWrite(attributeValue, value, this)
    } else {
      return attributeValue
    }
  }

  toDynamoAssert(value: any): DynamoDB.AttributeValue {
    const attributeValue = this.toDynamo(value)

    if (attributeValue == null) {
      throw new ValidationError('Attribute.toDynamoAssert called without a valid value')
    } else {
      return attributeValue
    }
  }

  /**
   * Convert DynamoDB raw response to understandable data
   */
  fromDynamo(attributeValue: DynamoDB.AttributeValue | null): Value | null {
    // if there is no value, apply the default, but allow the value to become null
    if (attributeValue == null) {
      attributeValue = this.toDynamo(null)
    }

    // all attributes support null
    if (attributeValue == null || attributeValue.NULL === true) {
      return null
    }

    const value = this.type.fromDynamo(attributeValue, this)

    if (typeof this.metadata.manipulateRead === 'function') {
      return this.metadata.manipulateRead(value, attributeValue, this)
    } else {
      return value
    }
  }
}
