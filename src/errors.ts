import { AWSError } from 'aws-sdk'
import { BatchWriteItemOutput } from 'aws-sdk/clients/dynamodb'

export class DyngooseError extends Error {
  constructor(message: string) {
    super(message)
    this.message = message
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
  }
}

export class TableError extends DyngooseError {}
export class SchemaError extends DyngooseError {}
export class QueryError extends DyngooseError {}
export class ValidationError extends DyngooseError {}

export class BatchError extends DyngooseError {
  constructor(message: string, public errors: AWSError[], public output: BatchWriteItemOutput) {
    super(message)
  }
}
