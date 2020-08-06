import { readdirSync } from 'fs'
import * as _ from 'lodash'
import { join } from 'path'
import { Table } from '../table'
import { isDyngooseTable } from './is'

export interface MigrateTablesInput {
  tablesDirectory: string

  // specify which files are the right files
  tableFileSuffix: string // maybe .table.js or .model.js

  // include a prefix or suffix in the table names during creation
  tableNamePrefix?: string
  tableNameSuffix?: string

  // you can optionally override the log function called
  log?: Function
}

export default async function migrateTables(input: MigrateTablesInput) {
  const tableFiles = readdirSync(input.tablesDirectory)
  const tables: (typeof Table)[] = []
  const log = input.log || console['log']
  log('Running Dyngoose migration utility…')

  for (const file of tableFiles) {
    if (file.endsWith(input.tableFileSuffix)) {
      const tableFile = join(input.tablesDirectory, file)
      const tableFileExports = require(tableFile)

      for (const exportedProperty of _.values(tableFileExports)) {
        if (isDyngooseTable(exportedProperty)) {
          tables.push(exportedProperty)
        }
      }
    }
  }

  for (const SomeTable of tables) {
    SomeTable.schema.options.name = `${input.tableNamePrefix || ''}${SomeTable.schema.name}${input.tableNameSuffix || ''}`
    log(`Migrating ${SomeTable.schema.name}`)
    await SomeTable.migrateTable()
  }
}
