import { Table } from '../table'

export function isDyngooseTableInstance(obj: any): obj is Table {
  return obj instanceof Table || isDyngooseTableClass(obj.constructor)
}

export function isDyngooseTableClass(obj: any): obj is typeof Table {
  const comp: boolean = obj.prototype instanceof Table || (obj?.schema?.isDyngoose)
  return comp
}
