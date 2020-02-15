import { AttributeMetadata } from '../attribute'

export interface StringAttributeMetadata extends AttributeMetadata<string> {
  trim?: boolean
  lowercase?: boolean
  uppercase?: boolean
}
