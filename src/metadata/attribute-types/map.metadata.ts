import { AttributeDefinition } from '../../decorator/attribute-types'
import { AttributeMetadata } from '../attribute'

export type MapBaseValue = Record<string, any>

export interface MapAttributeMetadata<MapBaseValue> extends AttributeMetadata<MapBaseValue> {
  attributes: { [propertyName: string]: AttributeDefinition }
  ignoreUnknownProperties?: boolean
}
