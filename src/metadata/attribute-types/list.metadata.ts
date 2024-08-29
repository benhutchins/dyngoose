import type { marshallOptions, unmarshallOptions } from '@aws-sdk/util-dynamodb'

import type { AttributeMetadata } from '../attribute'

export interface ListAttributeMetadata extends AttributeMetadata<any[]> {
  marshallOptions?: marshallOptions
  unmarshallOptions?: unmarshallOptions
}
