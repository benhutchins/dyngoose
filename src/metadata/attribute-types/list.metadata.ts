import { type AttributeDefinition } from '../../decorator/attribute-types'
import { type AttributeMetadata } from '../attribute'

export interface ListAttributeMetadata<Value> extends AttributeMetadata<Value> {
  attributes: Record<string, AttributeDefinition>
}
