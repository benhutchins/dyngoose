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
