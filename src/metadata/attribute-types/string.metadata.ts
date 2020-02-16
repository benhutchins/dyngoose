import { AttributeMetadata } from '../attribute'

export interface StringAttributeMetadata extends AttributeMetadata<string> {
  /**
   * Trim all values
   */
  trim?: boolean

  /**
   * Force all values to lowercase
   */
  lowercase?: boolean

  /**
   * Force all values to uppercase
   */
  uppercase?: boolean
}
