import { AttributeMetadata } from '../attribute'

export interface TimestampAttributeMetadata extends AttributeMetadata<number> {
  timeToLive?: boolean
  nowOnCreate?: boolean
  nowOnUpdate?: boolean
}
