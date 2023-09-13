import { type AttributeMetadata } from '../attribute'

export type BinarySetValue = Set<Uint8Array> | Uint8Array[]

export interface BinarySetAttributeMetadata extends AttributeMetadata<BinarySetValue> {
  /**
   * Return a native JavaScript array, rather than a Set.
   */
  array?: boolean
}
