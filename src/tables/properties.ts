import { type BinarySetAttributeValue } from 'aws-sdk/clients/dynamodb'
import { type Table } from '../table'

export type TableProperty<T> = Exclude<keyof T, keyof Table>

type KeyOfType<T, V> = keyof {
  [P in keyof T as T[P] extends V ? P : never]: any
}

export type SetValue = string[] | Array<bigint | number> | BinarySetAttributeValue[] | null | undefined

export type SetTableProperty<T> = KeyOfType<T, SetValue>

export type TableProperties<T> = {
  [key in TableProperty<T>]?: T[key]
}
