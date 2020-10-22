import { Table } from '../table'

export type TableProperty<T> = Exclude<Exclude<keyof T, keyof Table>, Function>

export type TableProperties<T> = {
  [key in TableProperty<T>]?: T[key]
}
