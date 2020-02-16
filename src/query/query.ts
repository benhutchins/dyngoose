import * as moment from 'moment'

export type ConditionValueType = string | boolean | number | Date | moment.Moment | null | void

export type Condition<T extends ConditionValueType> = (
  ['=', T]
  | ['<>', T] // not equals
  | ['<', T]
  | ['<=', T]
  | ['>', T]
  | ['>=', T]
  | ['beginsWith', T]
  | ['between', T, T]
)
