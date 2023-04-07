/* eslint-disable @typescript-eslint/no-var-requires */
import { Construct } from 'constructs'
import { readdir } from 'fs/promises'
import * as _ from 'lodash'
import { join } from 'path'
import { Table as CDKTable } from 'aws-cdk-lib/aws-dynamodb'
import { Table } from '../table'
import { createCDKTable } from '../tables/create-cdk-table'

export interface CreateCDKTablesInput {
  scope: Construct

  tablesDirectory: string

  // specify which files are the right files
  tableFileSuffix: string // maybe .table.js or .model.js

  // you can optionally override the log function called
  log?: Function
}

export async function createCDKTables(input: CreateCDKTablesInput): Promise<CDKTable> {
  const tableFiles = await readdir(input.tablesDirectory)
  const tables: Array<typeof Table> = []
  const resources: CDKTable[] = []
  const log = input.log == null ? console.log : input.log
  log('Running Dyngoose CDK generation utility…')

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
    const table = createCDKTable(input.scope, SomeTable.schema)
    log(`Generated ${table.tableName} CDK Table`)
    resources.push(table)
  }

  return resources as any
}
