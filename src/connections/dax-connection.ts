/* eslint-disable @typescript-eslint/no-var-requires */
import { type DynamoDB } from '@aws-sdk/client-dynamodb'
import { type Connection } from './connection'

export class DAXConnection implements Connection {
  private readonly __client: DynamoDB

  constructor(options: {
    endpoints: string[]
    requestTimeout?: number
  }) {
    const AmazonDaxClient = require('amazon-dax-client')
    this.__client = new AmazonDaxClient({
      endpoints: options.endpoints,
      requestTimeout: options.requestTimeout,
    })
  }

  public get client(): DynamoDB {
    return this.__client
  }
}
