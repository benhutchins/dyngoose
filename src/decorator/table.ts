import Config from '../config'
import { TableMetadata } from '../metadata/table'
import { ITable } from '../table'

export function Table(metadata: TableMetadata) {
  return (table: ITable<any>) => {
    table.schema.dynamo = metadata.connection || Config.defaultConnection.client
    table.schema.setMetadata(metadata)

    // setup dynamic properties
    table.schema.defineAttributeProperties()
    table.schema.defineGlobalSecondaryIndexes()
    table.schema.defineLocalSecondaryIndexes()
    table.schema.definePrimaryKeyProperty()
  }
}
