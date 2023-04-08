import { type AttributeMetadata } from '../attribute'
import { type NumberValue } from './number.metadata'

export type NumberSetValue = Set<NumberValue>

export interface NumberSetAttributeMetadata extends AttributeMetadata<NumberSetValue> {
}
