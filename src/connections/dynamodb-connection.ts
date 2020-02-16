import * as AWS from 'aws-sdk'
import { Agent as HTTPAgent } from 'http'
import { Agent as HTTPSAgent } from 'https'
import { Connection } from './connection'

export class DynamoDBConnection implements Connection {
  private __client: AWS.DynamoDB

  constructor(options: {
    endpoint?: string,
    enableAWSXray?: boolean,
  }) {
    const dynamoDBOptions = {
      endpoint: options.endpoint,
      httpOptions: {
        agent: this.httpAgent(options.endpoint),
      },
    }

    if (options.enableAWSXray) {
      // Since "require" itself does something for this lib, such as logging
      // importing this only when it's needed
      const AWSXRay = require('aws-xray-sdk-core')
      const aws = AWSXRay.captureAWS(AWS)
      this.__client = new aws.DynamoDB(dynamoDBOptions)
    } else {
      this.__client = new AWS.DynamoDB(dynamoDBOptions)
    }
  }

  private httpAgent(endpoint: string | undefined) {
    if (endpoint && endpoint.startsWith('http://')) {
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

  public get client() {
    return this.__client
  }
}
