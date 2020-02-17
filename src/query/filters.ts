import { Table } from '../table'
import { Condition } from './query'

export type Filter<Type> = Condition<Type> | (
  ['includes', Type[]] |
  ['excludes', Type[]] |
  // ['or', Filter<T>[]] |
  ['contains', Type] | // contains can only be used on string types
  ['null'] |
  ['not null'] |
  ['exists'] |
  ['not exists']
)

export type Filters<T extends Table> = {
  [key in Exclude<Exclude<keyof T, keyof Table>, Function>]?: T[key] | Filter<T[key]>
}
