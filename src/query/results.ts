import { DynamoDB } from 'aws-sdk'
import { Table } from '..'

export interface Results<T extends Table> {
  records: T[]
  count: number
  scannedCount: number
  lastEvaluatedKey?: DynamoDB.Key
  consumedCapacity: DynamoDB.ConsumedCapacity
}
