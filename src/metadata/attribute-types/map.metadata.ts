import { type AttributeDefinition } from '../../decorator/attribute-types'
import { type AttributeMetadata } from '../attribute'

export type MapBaseValue = Record<string, any>

export interface MapAttributeMetadata<MapBaseValue> extends AttributeMetadata<MapBaseValue> {
  attributes: Record<string, AttributeDefinition>
  ignoreUnknownProperties?: boolean
}
