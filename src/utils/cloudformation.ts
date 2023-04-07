/* eslint-disable @typescript-eslint/no-var-requires */
import { readdir } from 'fs/promises'
import * as _ from 'lodash'
import { join } from 'path'
import { Table } from '../table'
import { MigrateTablesInput } from './migrate'

export default async function createCloudFormationResources(input: MigrateTablesInput): Promise<any> {
  const tableFiles = await readdir(input.tablesDirectory)
  const tables: Array<typeof Table> = []
  const resources: any = {}
  const log = input.log == null ? console.log : input.log
  const prefix = input.tableNamePrefix == null ? '' : input.tableNamePrefix
  const suffix = input.tableNameSuffix == null ? '' : input.tableNameSuffix
  log('Running Dyngoose CloudFormation template generation utility…')

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
    const properties = SomeTable.schema.createCloudFormationResource()
    const tableName = properties.TableName as string
    let resourceName: string
    if (typeof SomeTable.schema.options.cloudFormationResourceName === 'string') {
      resourceName = SomeTable.schema.options.cloudFormationResourceName
    } else {
      resourceName = _.upperFirst(SomeTable.name)
      if (!resourceName.toLowerCase().endsWith('table')) {
        resourceName += 'Table'
      }
    }
    properties.TableName = `${prefix}${tableName}${suffix}`
    log(`Generated ${tableName} into ${resourceName} resource`)
    resources[resourceName] = {
      Type: 'AWS::DynamoDB::Table',
      Properties: properties,
    }
  }

  return resources
}
