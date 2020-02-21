import { readdirSync } from 'fs'
import * as _ from 'lodash'
import { join } from 'path'
import { Table } from '../table'
import { MigrateTablesInput } from './migrate'

export default async function createCloudFormationResources(input: MigrateTablesInput) {
  const tableFiles = readdirSync(input.tablesDirectory)
  const tables: (typeof Table)[] = []
  const resources: any = {}

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
    // log(`Processing ${colors.cyan(SomeTable.schema.name)}`)
    const properties = SomeTable.schema.createCloudFormationResource()
    const resourceName = `${SomeTable.schema.name}Table`
    properties.TableName = `${input.tableNamePrefix || ''}${properties.TableName}${input.tableNameSuffix || ''}`
    resources[resourceName] = {
      Type: 'AWS::DynamoDB::Table',
      Properties: properties,
    }
  }

  return resources
}
