import type { TableMetadata } from '../metadata/table'
import type { ITable } from '../table'

export function Table(metadata: TableMetadata) {
  return (table: ITable<any>) => {
    if (metadata.connection != null) {
      table.schema.dynamo = metadata.connection
    }

    table.schema.setMetadata(metadata)

    // setup dynamic properties
    table.schema.defineAttributeProperties()
    table.schema.defineGlobalSecondaryIndexes()
    table.schema.defineLocalSecondaryIndexes()
    table.schema.definePrimaryKeyProperty()
  }
}
