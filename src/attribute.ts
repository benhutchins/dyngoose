import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
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
    public propertyName: string,
    public type: IAttributeType<Value>,
    public metadata: AttributeMetadata<Value>,
  ) {
    this.name = this.metadata.name || this.propertyName
  }

  /**
   * Set the default value for an attribute, if no value is currently set
   */
  getDefaultValue(): Value | null {
    if (typeof this.metadata.default !== 'undefined') {
      return _.isFunction(this.metadata.default) ? this.metadata.default() : this.metadata.default
    } else if (this.type.getDefault) {
      return this.type.getDefault()
    } else {
      return null
    }
  }

  /**
   * Convert the given value for this attribute to a DynamoDB AttributeValue
   */
  toDynamo(value: Value | null, forQuery = false): DynamoDB.AttributeValue | null {
    // if there is no value, inject the default value for this attribute
    if (value == null || isTrulyEmpty(value)) {
      value = this.getDefaultValue()
    }

    // if we have no value, allow the manipulateWrite a chance to provide a value
    if (this.metadata.manipulateWrite && (value == null || isTrulyEmpty(value))) {
      const customAttributeValue = this.metadata.manipulateWrite(null, null, this)

      if (customAttributeValue) {
        return customAttributeValue
      }
    }

    // if there is no value, do not not return an empty DynamoDB.AttributeValue
    if (value == null || isTrulyEmpty(value)) {
      if (this.metadata.required) {
        throw new Error('Required value missing: ' + this.name)
      }
      return null
    }

    // if (this.isSet && !forQuery) {
    //   if (!_.isArray(val)) {
    //     throw new Error('Values must be array: ' + this.name)
    //   }
    //   if (val.length === 0) {
    //     return null
    //   }
    // }

    if (typeof this.metadata.validate === 'function' && !this.metadata.validate(value)) {
      throw new Error('Validation failed: ' + this.name)
    }

    const attributeValue = this.type.toDynamo(value, this)

    if (this.metadata.manipulateWrite) {
      return this.metadata.manipulateWrite(attributeValue, value, this)
    } else {
      return attributeValue
    }

    // } else if (this.type === AttributeType.List) {
    //   if (!_.isArray(val)) {
    //     throw new Error('Values must be array in a `list`: ' + this.name)
    //   }

    //   const dynamoList: DynamoDB.ListAttributeValue = []

    //   for (let i = 0; i < val.length; i++) {
    //     const item = val[i]

    //     // TODO currently only supports one attribute type
    //     const objAttr = this.attributes.get(0)
    //     if (objAttr) {
    //       const listItem = objAttr.toDynamo(item)

    //       if (listItem) {
    //         dynamoList.push(listItem)
    //       }
    //     }
    //   }

    //   dynamoObj.L = dynamoList
    // } else {
  }

  toDynamoAssert(value: any, forQuery = false): DynamoDB.AttributeValue {
    const attributeValue = this.toDynamo(value, forQuery)

    if (attributeValue == null) {
      throw new Error(`Attribute.toDynamoAssert called without a valid value`)
    } else {
      return attributeValue
    }
  }

  /**
   * Convert DynamoDB raw response to understandable data
   */
  fromDynamo(attributeValue: DynamoDB.AttributeValue | null): Value | null {
    // all attributes support null
    if (attributeValue == null || attributeValue.NULL) {
      return null
    }

    const value = this.type.fromDynamo(attributeValue, this) || null

    // // if this is a set/map (SS or NS), we need to treat it like an array
    // if (this.isSet && _.isArrayLike(raw)) {
    //   parsed = raw.map((value: any) => {
    //     if (this.metadata.fromDynamo) {
    //       return this.metadata.fromDynamo(value, this)
    //     }
    //   })
    // } else {
    //   parsed = this.metadata.fromDynamo(raw, this)
    // }

    if (this.metadata.manipulateRead) {
      return this.metadata.manipulateRead(value, attributeValue, this)
    } else {
      return value
    }
  }
}
