import { type Attribute } from '../attribute'
import { type IThroughput } from '../interfaces'

export interface PrimaryKey {
  readonly propertyName: string
  readonly hash: Attribute<any>
  readonly range?: Attribute<any>
}

export type GlobalSecondaryIndexProjection = 'ALL' | 'KEYS_ONLY' | 'INCLUDE'

export interface GlobalSecondaryIndex {
  readonly name: string
  readonly propertyName: string
  readonly hash: Attribute<any>
  readonly range?: Attribute<any>
  readonly projection?: GlobalSecondaryIndexProjection // defaults to 'ALL'
  readonly nonKeyAttributes?: string[]
  readonly throughput?: IThroughput
}

export type LocalSecondaryIndexProjection = GlobalSecondaryIndexProjection

export interface LocalSecondaryIndex {
  readonly name: string
  readonly propertyName: string
  // LocalSecondaryIndex Must have same hash key from primaryKey anyway.
  // readonly hash: Attribute
  readonly range: Attribute<any>
  readonly projection?: LocalSecondaryIndexProjection // defaults to 'ALL'
  readonly nonKeyAttributes?: string[]
}
