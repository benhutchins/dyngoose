import { AttributeMetadata } from '../attribute'

export interface StringSetAttributeMetadata extends AttributeMetadata<string[]> {
  trim?: boolean
  lowercase?: boolean
  uppercase?: boolean
}
