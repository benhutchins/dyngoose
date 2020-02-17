import { Table } from '../table'
import { Condition } from './query'

export type Filter<Type> = Condition<Type> | (
  ['includes', Type[]] |
  ['excludes', Type[]] |
  // ['or', Filter<T>[]] |
  ['contains', Type] | // contains can be used on a list or a string attribute
  ['not contains', Type] | // not contains can be used on a list or a string attribute
  ['null'] |
  ['not null'] |
  ['exists'] |
  ['not exists']
)

export type Filters<T extends Table> = {
  [key in Exclude<Exclude<keyof T, keyof Table>, Function>]?: T[key] | Filter<T[key]>
}

export type UpdateConditions<T extends Table> = Filters<T>
