import { AttributeMetadata } from '../attribute'
import { NumberValue } from './number.metadata'

export type NumberSetValue = Set<NumberValue>

export interface NumberSetAttributeMetadata extends AttributeMetadata<NumberSetValue> {
}
