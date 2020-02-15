import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import { Attribute } from '../../attribute'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { IAttributeType } from '../../interfaces/attribute-type.interface'
import { MapAttributeMetadata } from '../../metadata/attribute-types/map.metadata'
import { Table } from '../../table'
import { AttributeType } from '../../tables/attribute-type'

export interface IMapValue {
  [key: string]: string
}

export class MapAttributeType<Value extends IMapValue> extends AttributeType<Value, MapAttributeMetadata<Value>>
  implements IAttributeType<Value> {
  type = DynamoAttributeType.String
  attributes: { [key: string]: Attribute<any> }

  constructor(record: Table, propertyName: string, metadata: MapAttributeMetadata<Value>) {
    super(record, propertyName, metadata)
    this.attributes = {}

    // convert attributes from ChildAttributeMetadata types to
    for (const childAttributePropertyName of Object.keys(this.metadata.attributes)) {
      const childAttributeDef = this.metadata.attributes[childAttributePropertyName]
      const childAttribute = childAttributeDef.getAttribute(record, childAttributePropertyName)
      this.attributes[childAttribute.name] = childAttribute
    }
  }

  getDefault() {
    const map: any = {}

    for (const childAttribute of Object.values(this.attributes)) {
      map[childAttribute.name] = childAttribute.getDefaultValue()
    }

    return map as Value
  }

  toDynamo(mapValue: Value) {
    const map: DynamoDB.MapAttributeValue = {}

    for (const propertyName of Object.keys(mapValue)) {
      const attribute = _.find(this.attributes, (attr) => attr.propertyName === propertyName)
      const value = mapValue[propertyName]

      if (attribute) {
        const attributeValue = attribute.toDynamo(value)
        if (attributeValue != null) {
          map[attribute.propertyName] = attributeValue
        }
      } else {
        // TODO
      }
    }

    return { M: map }
  }

  fromDynamo(attributeValue: DynamoDB.AttributeValue): Value {
    const mapValue = attributeValue.M as DynamoDB.MapAttributeValue
    const map: any = mapValue

    for (const attributeName of Object.keys(mapValue)) {
      const value = mapValue[attributeName]
      const attribute = this.attributes[attributeName]

      if (attribute) {
        map[attribute.propertyName] = attribute.fromDynamo(value)
      } else {
        // TODO
      }
    }

    return map as Value
  }
}
