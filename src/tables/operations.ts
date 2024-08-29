import type { TableDescription } from '@aws-sdk/client-dynamodb'

import type { ITable } from '../table'
import { createTable } from './create-table'
import { deleteTable } from './delete-table'

export const TableOperations = {
  createTable: async (table: ITable<any>): Promise<TableDescription> => await createTable(table.schema),
  deleteTable: async (table: ITable<any>): Promise<TableDescription | undefined> => await deleteTable(table.schema),
}
