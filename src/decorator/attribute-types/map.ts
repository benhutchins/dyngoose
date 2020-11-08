import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import { Attribute } from '../../attribute'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { ValidationError } from '../../errors'
import { IAttributeType } from '../../interfaces/attribute-type.interface'
import { MapAttributeMetadata } from '../../metadata/attribute-types/map.metadata'
import { Table } from '../../table'
import { AttributeType } from '../../tables/attribute-type'

export class MapAttributeType<Value> extends AttributeType<Value, MapAttributeMetadata<Value>>
  implements IAttributeType<Value> {
  type = DynamoAttributeType.Map
  attributes: { [key: string]: Attribute<any> }

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

  toDynamo(mapValue: Value): DynamoDB.AttributeValue {
    if (!_.isObject(mapValue)) {
      throw new ValidationError(`Map attributes require values to be an Object, but was given a ${typeof mapValue}`)
    }

    const map: DynamoDB.MapAttributeValue = {}

    for (const propertyName of Object.keys(mapValue)) {
      const attribute = _.find(this.attributes, (attr) => attr.propertyName === propertyName)
      const value = _.get(mapValue, propertyName)

      if (attribute != null) {
        const attributeValue = attribute.toDynamo(value)
        if (attributeValue != null) {
          map[attribute.propertyName] = attributeValue
        }
      } else {
        throw new ValidationError(`Unknown property set on Map, ${propertyName}`)
      }
    }

    return { M: map }
  }

  fromDynamo(attributeValue: DynamoDB.AttributeValue): Value {
    const mapValue: DynamoDB.MapAttributeValue = attributeValue.M == null ? {} : attributeValue.M
    const map: any = mapValue

    for (const attributeName of Object.keys(mapValue)) {
      const value = mapValue[attributeName]
      const attribute = this.attributes[attributeName]

      if (attribute != null) {
        map[attribute.propertyName] = attribute.fromDynamo(value)
      } else {
        throw new ValidationError(`Unknown attribute seen on Map, ${attributeName}`)
      }
    }

    return map as Value
  }
}
