import { DynamoDB } from 'aws-sdk'
import { Connection } from './connection'

export class DAXConnection implements Connection {
  private __client: DynamoDB

  constructor(options: {
    endpoints: string[],
    requestTimeout?: number,
  }) {
    const AmazonDaxClient = require('amazon-dax-client')
    this.__client = new AmazonDaxClient({
      endpoints: options.endpoints,
      requestTimeout: options.requestTimeout,
    })
  }

  public get client() {
    return this.__client
  }
}
