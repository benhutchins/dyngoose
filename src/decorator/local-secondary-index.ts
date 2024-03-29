import { SchemaError } from '../errors'
import { type ITable } from '../table'

export function LocalSecondaryIndex(sortKeyName: string, options: { name?: string } = {}) {
  return (tableClass: ITable<any>, propertyName: string) => {
    const range = tableClass.schema.getAttributeByName(sortKeyName)
    if (range == null) {
      const attributes = tableClass.schema.getAttributes()
      const attributeNames = Object.keys(attributes)
      throw new SchemaError(`Given hashKey "${sortKeyName}" is not declared as attribute on table "${tableClass.schema.name}", known attributes are: ${attributeNames.join(', ')}`)
    }

    tableClass.schema.localSecondaryIndexes.push({
      name: options.name == null ? propertyName : options.name,
      propertyName,
      range,
    })
  }
}
