import { uniq } from 'lodash'

import { SchemaError } from '../errors'
import type { IThroughput } from '../interfaces'
import type * as Metadata from '../metadata'
import type { ITable } from '../table'

interface GlobalSecondaryIndexOptionsBase {
  name?: string
  projection?: Metadata.Index.GlobalSecondaryIndexProjection
  nonKeyAttributes?: string[]
  throughput?: IThroughput | number
}

interface GlobalSecondaryIndexOptionsLegacy extends GlobalSecondaryIndexOptionsBase {
  hashKey: string
  rangeKey?: string
}

interface GlobalSecondaryIndexOptionsModern extends GlobalSecondaryIndexOptionsBase {
  primaryKey: string
  sortKey?: string

  hashKey?: undefined
  rangeKey?: undefined
}

export type GlobalSecondaryIndexOptions = GlobalSecondaryIndexOptionsLegacy | GlobalSecondaryIndexOptionsModern

export function GlobalSecondaryIndex(options: GlobalSecondaryIndexOptions) {
  return (table: ITable<any>, propertyName: string) => {
    const primaryKey: string = (options as any).primaryKey ?? (options as any).hashKey
    const sortKey: string | undefined = (options as any).sortKey ?? (options as any).rangeKey

    let throughput: IThroughput | undefined

    if (typeof options.throughput === 'number') {
      throughput = {
        read: options.throughput,
        write: options.throughput,
      }
    } else if (options.throughput != null) {
      throughput = options.throughput
    }

    if (options.projection === 'INCLUDE') {
      if (options.nonKeyAttributes == null || options.nonKeyAttributes.length === 0) {
        throw new SchemaError('If Projection type INCLUDE is specified, some non-key attributes to include in the projection must be specified as well')
      }

      // 1. verify each attribute specified in nonKeyAttributes exists on the table
      // 2. remove the key attributes from nonKeyAttributes, as that causes problems
      // 3. remove duplicates as well
      options.nonKeyAttributes = uniq(options.nonKeyAttributes.filter((attributeName) => {
        // throws a SchemaError if the attribute does not exist
        table.schema.getAttributeByName(attributeName)

        // remove the attribute if it is a key attribute, as it is not necessary to be specified
        return !(attributeName === primaryKey || attributeName === sortKey)
      }))
    }

    const index: Metadata.Index.GlobalSecondaryIndex = {
      propertyName,
      name: options.name ?? propertyName,
      hash: table.schema.getAttributeByName(primaryKey),
      range: sortKey == null ? undefined : table.schema.getAttributeByName(sortKey),
      projection: options.projection,
      nonKeyAttributes: options.nonKeyAttributes,
      throughput,
    }

    table.schema.globalSecondaryIndexes.push(index)
  }
}
