import type { AttributeMetadata } from '../attribute'

export type NumberValue = number | bigint

export interface NumberAttributeMetadata extends AttributeMetadata<NumberValue> {
}
