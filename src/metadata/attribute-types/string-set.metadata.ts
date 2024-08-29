import type { AttributeMetadata } from '../attribute'

export type StringSetValue = Set<string> | string[]

export interface StringSetAttributeMetadata extends AttributeMetadata<StringSetValue> {
  /**
   * Return a native JavaScript array, rather than a Set.
   */
  array?: boolean
}
