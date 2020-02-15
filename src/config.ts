import { Connection, DynamoDBConnection } from './connections'

export default class Config {
  private static __defaultConnection: Connection

  public static get defaultConnection() {
    if (!this.__defaultConnection) {
      this.__defaultConnection = new DynamoDBConnection({
        endpoint: process.env.DYNAMO_ENDPOINT,
        enableAWSXray: process.env.ENABLE_XRAY === 'true',
      })
    }
    return this.__defaultConnection
  }
}
