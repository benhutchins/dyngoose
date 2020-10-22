import { Table } from '../table'

export function isDyngooseTable(obj: any): boolean {
  return obj.prototype instanceof Table || (obj?.schema?.isDyngoose)
}
