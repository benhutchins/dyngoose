import { IThroughput } from '../interfaces'
import * as Metadata from '../metadata'
import { ITable } from '../table'

export interface GlobalSecondaryIndexOptions {
  hashKey: string
  rangeKey?: string
  name?: string
  projection?: Metadata.Index.GlobalSecondaryIndexProjection
  nonKeyAttributes?: string[]
  throughput?: IThroughput
}

export function GlobalSecondaryIndex(options: GlobalSecondaryIndexOptions) {
  return (table: ITable<any>, propertyName: string) => {
    const index: Metadata.Index.GlobalSecondaryIndex = {
      propertyName,
      name: options.name || propertyName,
      hash: table.schema.getAttributeByName(options.hashKey, false),
      range: options.rangeKey ? table.schema.getAttributeByName(options.rangeKey, false) : undefined,
      projection: options.projection,
      nonKeyAttributes: options.nonKeyAttributes,
      throughput: options.throughput,
    }

    table.schema.globalSecondaryIndexes.push(index)
  }
}
