// const log = require('fancy-log')
// const colors = require('ansi-colors')
import { readdirSync, readFileSync } from 'fs'
import * as _ from 'lodash'
import { join } from 'path'
import { PrimaryKey } from '../query'
import { Table } from '../table'
import { MigrateTablesInput } from './migrate'

export interface SeedTablesInput extends MigrateTablesInput {
  seedsDirectory: string
  preventDuplication?: boolean
}

export default async function seedTables(input: SeedTablesInput) {
  const seedFiles = readdirSync(input.seedsDirectory)

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
      const modelPath = join(input.tablesDirectory, `${modelName}.${input.tableFileSuffix}`)

      // log(`Seeding ${colors.cyan(modelName)}`)

      const tableFileExports = require(modelPath)
      let hasSeeded = false

      for (const ExportedProperty of _.values(tableFileExports)) {
        if (ExportedProperty.prototype instanceof Table) {
          const ExportedTable = ExportedProperty as typeof Table
          ExportedTable.schema.options.name = `${input.tableNamePrefix || ''}${ExportedTable.schema.name}${input.tableNameSuffix || ''}`

          for (const data of records) {
            if (input.preventDuplication) {
              const hashKey = ExportedTable.schema.primaryKey.hash.name
              const rangeKey = ExportedTable.schema.primaryKey.range ? ExportedTable.schema.primaryKey.range.name : null
              const primaryKey = (ExportedTable as any)[ExportedTable.schema.primaryKey.propertyName] as PrimaryKey<any, any, any>
              const existingRecord = await primaryKey.get(data[hashKey], rangeKey ? data[rangeKey] : undefined)

              if (existingRecord) {
                continue
              }
            }

            const record = ExportedTable.new(data)
            await record.save({ log: false })
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
