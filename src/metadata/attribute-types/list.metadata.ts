import { AttributeDefinition } from '../../decorator/attribute-types'
import { AttributeMetadata } from '../attribute'

export interface ListAttributeMetadata<Value> extends AttributeMetadata<Value> {
  attributes: { [propertyName: string]: AttributeDefinition }
}
