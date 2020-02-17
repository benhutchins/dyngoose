import { Table } from '../table'

export type TableProperties<T> = {
  [key in Exclude<Exclude<keyof T, keyof Table>, Function>]?: T[key]
}
