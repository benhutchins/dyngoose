import { type ITable } from '../table'

export function PrimaryKey(primaryKey: string, sortKey?: string) {
  return (tableClass: ITable<any>, propertyKey: string) => {
    tableClass.schema.setPrimaryKey(primaryKey, sortKey, propertyKey)
  }
}
