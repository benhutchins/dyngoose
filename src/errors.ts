import { type BatchWriteItemOutput, type DynamoDBServiceException } from '@aws-sdk/client-dynamodb'
import { type ITable } from './table'

export class DyngooseError extends Error {
  constructor(message: string) {
    super(message)
    this.message = message
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
  }
}

export class HelpfulError extends DyngooseError {
  tableName?: string

  constructor(error: DynamoDBServiceException, public tableClass?: ITable<any>, public queryInput?: any) {
    super(error.message)
    Object.assign(this, error)
    Error.captureStackTrace(this, this.constructor)
    this.name = error.name
    if (tableClass != null) {
      this.tableName = tableClass.schema.name
    }
  }
}

export class SchemaError extends DyngooseError {}
export class QueryError extends DyngooseError {}
export class ValidationError extends DyngooseError {}

export class BatchError extends DyngooseError {
  constructor(message: string, public errors: HelpfulError[], public output: BatchWriteItemOutput) {
    super(message)
  }
}
