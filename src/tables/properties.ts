import type { NumberSetValue } from '../metadata/attribute-types/number-set.metadata'
import type { StringSetValue } from '../metadata/attribute-types/string-set.metadata'
import type { Table } from '../table'

export type TableProperty<T> = Exclude<keyof T, keyof Table>

export type TablePropertyValue<P> =
  P extends NumberSetValue ? NumberSetValue :
    P extends StringSetValue ? StringSetValue : P

export type TableProperties<T> = {
  [key in TableProperty<T>]?: TablePropertyValue<T[key]>
}
