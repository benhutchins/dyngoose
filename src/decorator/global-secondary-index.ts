import { SchemaError } from '../errors'
import { IThroughput } from '../interfaces'
import * as Metadata from '../metadata'
import { ITable } from '../table'

export interface GlobalSecondaryIndexOptions {
  hashKey: string
  rangeKey?: string
  name?: string
  projection?: Metadata.Index.GlobalSecondaryIndexProjection
  nonKeyAttributes?: string[]
  throughput?: IThroughput | number
}

export function GlobalSecondaryIndex(options: GlobalSecondaryIndexOptions) {
  return (table: ITable<any>, propertyName: string) => {
    let throughput: IThroughput | undefined

    if (typeof options.throughput === 'number') {
      throughput = {
        read: options.throughput,
        write: options.throughput,
      }
    } else if (options.throughput != null) {
      throughput = options.throughput
    }

    const index: Metadata.Index.GlobalSecondaryIndex = {
      propertyName,
      name: options.name == null ? propertyName : options.name,
      hash: table.schema.getAttributeByName(options.hashKey),
      range: options.rangeKey == null ? undefined : table.schema.getAttributeByName(options.rangeKey),
      projection: options.projection,
      nonKeyAttributes: options.nonKeyAttributes,
      throughput,
    }

    if (index.projection === 'INCLUDE' && (options.nonKeyAttributes?.length === 0)) {
      throw new SchemaError('If Projection type INCLUDE is specified, some non-key attributes to include in the projection must be specified as well')
    }

    table.schema.globalSecondaryIndexes.push(index)
  }
}
