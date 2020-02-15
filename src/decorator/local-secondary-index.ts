import { ITable } from '../table'

export function LocalSecondaryIndex(rangeKeyName: string, options: { name?: string; } = {}) {
  return (tableClass: ITable<any>, propertyName: string) => {
    const range = tableClass.schema.getAttributeByName(rangeKeyName)
    if (!range) {
      throw new Error(`Given hashKey ${rangeKeyName} is not declared as attribute`)
    }

    tableClass.schema.localSecondaryIndexes.push({
      name: options.name || propertyName,
      propertyName,
      range,
    })
  }
}
