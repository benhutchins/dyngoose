import { BatchWrite } from './batch-write'
import * as Config from './config'
import * as Connection from './connections'
import * as Decorator from './decorator'
import { DynamoAttributeType } from './dynamo-attribute-types'
import * as Errors from './errors'
import * as Events from './events'
import * as Metadata from './metadata'
import * as Query from './query'
import { ITable, Table } from './table'
import { AttributeType } from './tables/attribute-type'
import { createTable } from './tables/create-table'
import { deleteTable } from './tables/delete-table'
import { Transaction } from './transaction'
import { QueryOutput } from './query/output'

export const TableOperations = {
  createTable: async (table: ITable<any>) => await createTable(table.schema),
  deleteTable: async (table: ITable<any>) => await deleteTable(table.schema),
}

export {
  AttributeType,
  BatchWrite,
  Config,
  Connection,
  Decorator,
  DynamoAttributeType,
  Errors,
  Events,
  Metadata,
  Query,
  QueryOutput,
  Table,
  Transaction,
}

// export decorators prefixed with $ for convenience
export { Decorator as $ }
export { DocumentClient as $DocumentClient } from './decorator/document-client'
export { GlobalSecondaryIndex as $GlobalSecondaryIndex, GlobalSecondaryIndexOptions } from './decorator/global-secondary-index'
export { LocalSecondaryIndex as $LocalSecondaryIndex } from './decorator/local-secondary-index'
export { PrimaryKey as $PrimaryKey } from './decorator/primary-key'
export { Table as $Table } from './decorator/table'

export { Attribute } from './decorator'
export { DocumentClient } from './document-client'
