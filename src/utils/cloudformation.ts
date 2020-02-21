import { readdirSync } from 'fs'
import * as _ from 'lodash'
import { join } from 'path'
import { Table } from '../table'
import { MigrateTablesInput } from './migrate'

export default async function createCloudFormationResources(input: MigrateTablesInput) {
  const tableFiles = readdirSync(input.tablesDirectory)
  const tables: (typeof Table)[] = []
  const resources: any = {}
  const log = input.log || console['log']
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
    let resourceName = _.upperFirst(SomeTable.name)
    if (!resourceName.toLowerCase().endsWith('table')) {
      resourceName += 'Table'
    }
    properties.TableName = `${input.tableNamePrefix || ''}${properties.TableName}${input.tableNameSuffix || ''}`
    log(`Generated ${properties.TableName} into ${resourceName} resource`)
    resources[resourceName] = {
      Type: 'AWS::DynamoDB::Table',
      Properties: properties,
    }
  }

  return resources
}
