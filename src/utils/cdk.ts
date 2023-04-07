/* eslint-disable @typescript-eslint/no-var-requires */
import { Construct } from 'constructs'
import { Table as CDKTable } from '@aws-cdk/aws-dynamodb'
import { readdir } from 'fs/promises'
import * as _ from 'lodash'
import { join } from 'path'
import { Table } from '../table'
import { MigrateTablesInput } from './migrate'

export default async function createCDKTables(construct: Construct, input: MigrateTablesInput): Promise<CDKTable[]> {
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
    const table = SomeTable.schema.createCDKResource(construct)
    log(`Generated ${table.tableName} CDK Table`)
    resources.push(table)
  }

  return resources
}
