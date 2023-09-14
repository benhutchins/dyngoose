import { type marshallOptions, type unmarshallOptions } from '@aws-sdk/util-dynamodb'
import { type AttributeMetadata } from '../attribute'

export type DynamicAttributeValue = any

export interface DynamicAttributeMetadata extends AttributeMetadata<DynamicAttributeValue> {
  marshallOptions?: marshallOptions
  unmarshallOptions?: unmarshallOptions
}
