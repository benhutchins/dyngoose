export type Condition<T> = (
  ['=', T]
  | ['<>', T] // not equals
  | ['<', T]
  | ['<=', T]
  | ['>', T]
  | ['>=', T]
  | ['beginsWith', Exclude<T, number>] // causes a type error when a number is used with beginsWith, which is unsupported by DynamoDB
  | ['between', T, T]
)
