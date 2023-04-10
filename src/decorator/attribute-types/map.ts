import { type AttributeValue } from '@aws-sdk/client-dynamodb'
import { each, find, get, isFunction, isObject } from 'lodash'
import { type Attribute } from '../../attribute'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { ValidationError } from '../../errors'
import { type AttributeMap, type IAttributeType } from '../../interfaces'
import { type MapAttributeMetadata, type MapBaseValue } from '../../metadata/attribute-types/map.metadata'
import { type Table } from '../../table'
import { AttributeType } from '../../tables/attribute-type'
import { isTrulyEmpty } from '../../utils/truly-empty'

export class MapAttributeType<Value extends MapBaseValue> extends AttributeType<Value, MapAttributeMetadata<Value>>
  implements IAttributeType<Value> {
  type = DynamoAttributeType.Map
  attributes: Record<string, Attribute<any>>

  constructor(record: Table, propertyName: string, protected metadata: MapAttributeMetadata<Value>) {
    super(record, propertyName, metadata)
    this.attributes = {}

    // convert attributes from ChildAttributeMetadata types to
    for (const childAttributePropertyName of Object.keys(this.metadata.attributes)) {
      const childAttributeDef = this.metadata?.attributes[childAttributePropertyName]
      const childAttribute = childAttributeDef.getAttribute(record, childAttributePropertyName)
      this.attributes[childAttribute.name] = childAttribute
    }
  }

  getDefault(): Value {
    const map: any = {}

    for (const childAttribute of Object.values(this.attributes)) {
      map[childAttribute.name] = childAttribute.getDefaultValue()
    }

    return map as Value
  }

  toDynamo(mapValue: Value): AttributeValue {
    if (!isObject(mapValue)) {
      throw new ValidationError(`Map attributes require values to be an Object, but was given a ${typeof mapValue}`)
    }

    const map: AttributeMap = {}

    for (const propertyName of Object.keys(mapValue)) {
      const attribute = find(this.attributes, (attr) => attr.propertyName === propertyName)
      const value = get(mapValue, propertyName)

      if (attribute != null) {
        const attributeValue = attribute.toDynamo(value)
        if (attributeValue != null) {
          map[attribute.name] = attributeValue
        }
      } else if (this.metadata.ignoreUnknownProperties !== true) {
        throw new ValidationError(`Unknown property set on Map, ${propertyName}`)
      }
    }

    return { M: map }
  }

  fromDynamo(attributeValue: AttributeValue): Value {
    const mapValue: AttributeMap = attributeValue.M == null ? {} : attributeValue.M
    const map: any = {}

    for (const attributeName of Object.keys(mapValue)) {
      const value = mapValue[attributeName]
      const attribute = this.attributes[attributeName]

      if (attribute != null) {
        map[attribute.propertyName] = attribute.fromDynamo(value)
      } else if (this.metadata.ignoreUnknownProperties !== true) {
        throw new ValidationError(`Unknown attribute seen on Map, ${attributeName}`)
      }
    }

    return map as Value
  }

  fromJSON(json: any): Value {
    const mapValue: any = {}

    each(json, (value: any, propertyName: string) => {
      const attribute = find(this.attributes, (attr) => attr.propertyName === propertyName)

      if (attribute != null) {
        if (typeof attribute.type.fromJSON === 'function') {
          value = attribute.type.fromJSON(value)
        }

        // compare to current value, to avoid unnecessarily marking attributes as needing to be saved
        mapValue[propertyName] = value
      }
    })

    return mapValue
  }

  toJSON(mapValue: Value): any {
    const json: any = {}

    for (const propertyName of Object.keys(mapValue)) {
      const attribute = find(this.attributes, (attr) => attr.propertyName === propertyName)
      const value = get(mapValue, propertyName)

      if (attribute != null) {
        if (!isTrulyEmpty(value)) {
          if (isFunction(attribute.type.toJSON)) {
            json[propertyName] = attribute.type.toJSON(value, attribute)
          } else {
            json[propertyName] = value
          }
        }
      } else if (this.metadata.ignoreUnknownProperties !== true) {
        throw new ValidationError(`Unknown property set on Map, ${propertyName}`)
      }
    }

    return json
  }
}
