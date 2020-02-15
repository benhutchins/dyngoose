import { Condition, ConditionValueType } from './query'

export type FilterValueType = ConditionValueType

export type Filter = Condition<FilterValueType> | (
  ['includes', FilterValueType[]] |
  ['excludes', FilterValueType[]] |
  // ['or', Filter<T>[]] |
  ['contains', string] | // contains can only be used on string types
  ['null'] |
  ['not null'] |
  ['exists'] |
  ['not exists']
  // | ['<', T]
  // | ['<=', T]
  // | ['>', T]
  // | ['>=', T]
  // | ['beginsWith', T]
  // | ['between', T, T]
)

export interface Filters {
  // when the value is an array of QueryFilter objects, the filter for that value acts an an OR statement
  [key: string]: FilterValueType | Filter
}

const f: Filters = {
  t: ['<', 1],
  b: ['includes', [2]],
  c: ['contains', 'something'],
}
