/* eslint-disable @typescript-eslint/no-var-requires */
import { DynamoDB, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'
import { type Connection } from './connection'

interface DyngooseDynamoDBConnectionOptions extends DynamoDBClientConfig {
  enableAWSXray?: boolean
}

export class DynamoDBConnection implements Connection {
  private readonly __client: DynamoDB

  constructor(options: DyngooseDynamoDBConnectionOptions) {
    // if (options.enableAWSXray === true) {
    //   // Since "require" itself does something for this lib, such as logging
    //   // importing this only when it's needed
    //   const AWSXRay = require('aws-xray-sdk-core')
    //   const aws = AWSXRay.captureAWS(AWS)
    //   this.__client = new aws.DynamoDB(options)
    // } else {
    this.__client = new DynamoDB(options)
    // }
  }

  public get client(): DynamoDB {
    return this.__client
  }
}
