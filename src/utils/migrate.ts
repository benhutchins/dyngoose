// const log = require('fancy-log')
// const colors = require('ansi-colors')
import { readdirSync } from 'fs'
import * as _ from 'lodash'
import { join } from 'path'
import { Table } from '../table'

export interface MigrateTablesInput {
  tablesDirectory: string
  tableFileSuffix: string // maybe .table.js or .model.js
  tableNamePrefix?: string
  tableNameSuffix?: string
  preventDuplication?: boolean
}

export default async function migrateTables(input: MigrateTablesInput) {
  const tableFiles = readdirSync(input.tablesDirectory)
  const tables: (typeof Table)[] = []

  for (const file of tableFiles) {
    if (file.endsWith(input.tableFileSuffix)) {
      const tableFile = join(input.tablesDirectory, file)
      const tableFileExports = require(tableFile)

      for (const exportedProperty of _.values(tableFileExports)) {
        if (exportedProperty.prototype instanceof Table) {
          tables.push(exportedProperty)
        }
      }
    }
  }

  for (const SomeTable of tables) {
    SomeTable.schema.options.name = `${input.tableNamePrefix}${SomeTable.schema.name}${input.tableFileSuffix}`
    // log(`Migrating ${colors.cyan(SomeTable.schema.name)}`)
    await SomeTable.migrateTable()
  }
}
