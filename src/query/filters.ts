import { Table } from '../table'
import { Condition } from './query'

export type Filter<Type> = Condition<Type> | (
  ['includes', Type[]] |
  ['excludes', Type[]] |
  ['contains', Type] | // contains can be used on a list or a string attribute
  ['not contains', Type] | // not contains can be used on a list or a string attribute
  ['null'] |
  ['not null'] |
  ['exists'] |
  ['not exists']
)

export type FilterAssociationMap<T extends Table> = {
  [key in Exclude<Exclude<keyof T, keyof Table>, Function>]?: T[key] | Filter<T[key]>
}

export type Filters<T extends Table> = FilterAssociationMap<T> | Array<FilterAssociationMap<T> | FilterAssociationMap<T>[]>

export type UpdateConditions<T extends Table> = Filters<T>
