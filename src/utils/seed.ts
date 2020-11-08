/* eslint-disable @typescript-eslint/no-var-requires */
import { readdirSync, readFileSync } from 'fs'
import * as _ from 'lodash'
import { join } from 'path'
import { PrimaryKey } from '../query'
import { Table } from '../table'
import { isDyngooseTableClass } from './is'
import { MigrateTablesInput } from './migrate'

export interface SeedTablesInput extends MigrateTablesInput {
  seedsDirectory: string
  preventDuplication?: boolean
}

export default async function seedTables(input: SeedTablesInput): Promise<void> {
  const log = input.log == null ? console.log : input.log
  const seedFiles = readdirSync(input.seedsDirectory)
  const tableFileSuffix = input.tableFileSuffix.substr(0, 1) === '.' ? input.tableFileSuffix : `.${input.tableFileSuffix}`

  for (const file of seedFiles) {
    const filePath = join(input.seedsDirectory, file)
    let records = []

    if (file.endsWith('.seed.json')) {
      records = JSON.parse(readFileSync(filePath, 'utf8'))
    } else if (file.endsWith('.seed.js')) {
      const seedModule: Promise<any> | Function | any[] = require(filePath)

      if (typeof seedModule === 'function') {
        const seedModuleReturn = seedModule()

        // if the function returns a promise, handle that
        if (seedModuleReturn instanceof Promise) {
          records = await seedModuleReturn
        } else {
          records = seedModuleReturn
        }
      } else if (seedModule instanceof Promise) {
        records = await seedModule
      } else {
        records = seedModule
      }
    }

    if (records.length > 0) {
      const modelName = file.replace(/.seed.(json|js)/, '')
      const modelPath = join(input.tablesDirectory, `${modelName}${tableFileSuffix}`)
      const prefix = input.tableNamePrefix == null ? '' : input.tableNamePrefix
      const suffix = input.tableNameSuffix == null ? '' : input.tableNameSuffix

      log(`Seeding ${modelName}`)

      const tableFileExports = require(modelPath)
      let hasSeeded = false

      for (const ExportedProperty of _.values(tableFileExports)) {
        if (isDyngooseTableClass(ExportedProperty)) {
          const ExportedTable = ExportedProperty
          ExportedTable.schema.options.name = `${prefix}${ExportedTable.schema.name}${suffix}`

          for (const data of records) {
            if (input.preventDuplication === true) {
              const hashKey = ExportedTable.schema.primaryKey.hash.name
              const rangeKey = ExportedTable.schema.primaryKey.range == null ? null : ExportedTable.schema.primaryKey.range.name
              const primaryKey = (ExportedTable as any)[ExportedTable.schema.primaryKey.propertyName] as PrimaryKey<Table, any, any>
              const existingRecord = await primaryKey.get(data[hashKey], rangeKey == null ? undefined : data[rangeKey])

              if (existingRecord == null) {
                continue
              }
            }

            const record = ExportedTable.new(data)
            await record.save()
          }

          hasSeeded = true
        }
      }

      if (!hasSeeded) {
        throw new Error(`Failed to seed ${modelName}`)
      }
    }
  }
}
