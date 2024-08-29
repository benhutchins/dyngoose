/* eslint-disable @typescript-eslint/no-var-requires */
import { readdirSync } from 'fs'
import * as _ from 'lodash'
import { join } from 'path'

import type { Table } from '../table'
import { isDyngooseTableClass } from './is'

export interface MigrateTablesInput {
  tablesDirectory: string

  // specify which files are the right files
  tableFileSuffix: string // maybe .table.js or .model.js

  // include a prefix or suffix in the table names during creation
  tableNamePrefix?: string
  tableNameSuffix?: string

  // you can optionally override the log function called
  log?: (message: string) => any
}

export default async function migrateTables(input: MigrateTablesInput): Promise<void> {
  const tableFiles = readdirSync(input.tablesDirectory)
  const tables: Array<typeof Table> = []
  const log = input.log ?? console.log
  const prefix = input.tableNamePrefix ?? ''
  const suffix = input.tableNameSuffix ?? ''
  log('Running Dyngoose migration utility…')

  for (const file of tableFiles) {
    if (file.endsWith(input.tableFileSuffix)) {
      const tableFile = join(input.tablesDirectory, file)
      const tableFileExports = require(tableFile)

      for (const exportedProperty of _.values(tableFileExports)) {
        if (isDyngooseTableClass(exportedProperty)) {
          tables.push(exportedProperty)
        }
      }
    }
  }

  for (const SomeTable of tables) {
    SomeTable.schema.options.name = `${prefix}${SomeTable.schema.name}${suffix}`
    log(`Migrating ${SomeTable.schema.name}`)
    await SomeTable.migrateTable()
  }
}
