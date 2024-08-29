import type { DynamoDBServiceException } from '@aws-sdk/client-dynamodb'

import type { ITable } from '../table'
import { DyngooseError } from './dyngoose-error'

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
