import type { marshallOptions, NativeAttributeValue, unmarshallOptions } from '@aws-sdk/util-dynamodb'

import type { AttributeDefinition } from '../../decorator/attribute-types'
import type { AttributeMetadata } from '../attribute'

export type MapBaseValue = Record<string, NativeAttributeValue>

export interface MapAttributeMetadata<MapBaseValue> extends AttributeMetadata<MapBaseValue> {
  attributes: Record<string, AttributeDefinition>

  /**
   * Specify how arbitrary attributes should be handled on this map.
   *
   * Options:
   *  * error (default)
   *  * marshall
   *  * ignore
   *
   * By default, Dyngoose throws an error when it sees an arbitrary attribute
   * on a map, both when setting a value to Dynamo and when loading a value from
   * a saved Dynamo record.
   *
   * When set to 'marshall', unknown properties set on the map will be saved and
   * restored, relies on AWS' marshall utility to convert any JavaScript value
   * to DynamoDB and vice versa.
   *
   * When set to'ignore', unknown properties set on this map will be ignored.
   *
   * @default {string} error
   */
  arbitraryAttributes?: 'error' | 'marshall' | 'ignore'

  marshallOptions?: marshallOptions
  unmarshallOptions?: unmarshallOptions

  /**
   * @deprecated, set `arbitraryAttributes` to 'ignore'
   */
  ignoreUnknownProperties?: boolean
}
