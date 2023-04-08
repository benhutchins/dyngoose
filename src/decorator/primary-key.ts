import { type ITable } from '../table'

export function PrimaryKey(hashKey: string, rangeKey?: string) {
  return (tableClass: ITable<any>, propertyKey: string) => {
    tableClass.schema.setPrimaryKey(hashKey, rangeKey, propertyKey)
  }
}
