import { type AttributeMetadata } from '../attribute'
import { type NumberValue } from './number.metadata'

export type NumberSetValue = Set<NumberValue> | number[]

export interface NumberSetAttributeMetadata extends AttributeMetadata<NumberSetValue> {
  /**
   * Return a native JavaScript array, rather than a Set.
   */
  array?: boolean
}
