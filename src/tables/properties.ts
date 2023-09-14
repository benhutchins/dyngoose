import { type Table } from '../table'

export type TableProperty<T> = Exclude<keyof T, keyof Table>

export type TableProperties<T> = {
  [key in TableProperty<T>]?: T[key]
}
