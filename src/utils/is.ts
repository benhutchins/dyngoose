import { Table } from '../table'

export function isDyngooseTable(obj: any) {
  return obj.prototype instanceof Table || (obj && obj.schema && obj.schema.isDyngoose)
}
