import { AttributeDefinition } from '../../decorator/attribute-types'
import { AttributeMetadata } from '../attribute'

export interface MapAttributeMetadata<Value> extends AttributeMetadata<Value> {
  attributes: { [propertyName: string]: AttributeDefinition }
  ignoreUnknownProperties?: boolean
}
