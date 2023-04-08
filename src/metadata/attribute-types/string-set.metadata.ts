import { type AttributeMetadata } from '../attribute'

export type StringSetValue = Set<string>

export interface StringSetAttributeMetadata extends AttributeMetadata<StringSetValue> {
  trim?: boolean
  lowercase?: boolean
  uppercase?: boolean
}
