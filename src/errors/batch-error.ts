import type { BatchWriteItemOutput } from '@aws-sdk/client-dynamodb'

import { DyngooseError } from './dyngoose-error'
import type { HelpfulError } from './helpful-error'

export class BatchError extends DyngooseError {
  constructor(message: string, public errors: HelpfulError[], public output: BatchWriteItemOutput) {
    super(message)
  }
}
