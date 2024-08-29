export class DyngooseError extends Error {
  constructor(message: string) {
    super(message)
    this.message = message
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
  }
}