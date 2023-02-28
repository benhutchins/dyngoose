import { AttributeMetadata } from '../attribute'

export type BinarySetValue = Set<Uint8Array>

export interface BinarySetAttributeMetadata extends AttributeMetadata<BinarySetValue> {
}
