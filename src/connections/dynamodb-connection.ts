/* eslint-disable @typescript-eslint/no-var-requires */
import * as AWS from 'aws-sdk'
import { Agent as HTTPAgent } from 'http'
import { Agent as HTTPSAgent } from 'https'
import { Connection } from './connection'

interface DyngooseDynamoDBConnectionOptions extends AWS.DynamoDB.ClientConfiguration {
  enableAWSXray?: boolean
}

export class DynamoDBConnection implements Connection {
  private readonly __client: AWS.DynamoDB

  constructor(options: DyngooseDynamoDBConnectionOptions) {
    options.httpOptions = {
      agent: this.httpAgent(options.endpoint),
    }

    if (options.enableAWSXray === true) {
      // Since "require" itself does something for this lib, such as logging
      // importing this only when it's needed
      const AWSXRay = require('aws-xray-sdk-core')
      const aws = AWSXRay.captureAWS(AWS)
      this.__client = new aws.DynamoDB(options)
    } else {
      this.__client = new AWS.DynamoDB(options)
    }
  }

  private httpAgent(endpoint: string | undefined): HTTPAgent {
    if (endpoint?.startsWith('http://') === true) {
      return new HTTPAgent({
        keepAlive: true,
      })
    } else {
      return new HTTPSAgent({
        rejectUnauthorized: true,
        keepAlive: true,
      })
    }
  }

  public get client(): AWS.DynamoDB {
    return this.__client
  }
}
