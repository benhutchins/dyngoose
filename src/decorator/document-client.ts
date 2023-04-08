import { type ITable } from '../table'

export function DocumentClient() {
  return (tableClass: ITable<any>, propertyKey: string) => {
    Object.defineProperty(
      tableClass,
      propertyKey,
      {
        value: tableClass.documentClient,
        writable: false,
      },
    )
  }
}
