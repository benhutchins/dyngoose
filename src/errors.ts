import { AWSError } from 'aws-sdk'
import { BatchWriteItemOutput } from 'aws-sdk/clients/dynamodb'
import { ITable } from './table'

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

  constructor(error: AWSError, public tableClass?: ITable<any>, public queryInput?: any) {
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
  constructor(message: string, public errors: AWSError[], public output: BatchWriteItemOutput) {
    super(message)
  }
}
