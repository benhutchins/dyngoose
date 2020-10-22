import { Connection, DynamoDBConnection } from './connections'

export default class Config {
  private static __defaultConnection: Connection

  public static get defaultConnection(): Connection {
    if (this.__defaultConnection == null) {
      this.__defaultConnection = new DynamoDBConnection({
        endpoint: process.env.DYNAMO_ENDPOINT,
        region: process.env.DYNAMO_REGION,
        accessKeyId: process.env.DYNAMO_ACCESS_KEY_ID,
        secretAccessKey: process.env.DYNAMO_SECRET_ACCESS_KEY,
        enableAWSXray: process.env.ENABLE_XRAY === 'true',
      })
    }
    return this.__defaultConnection
  }

  // this is to avoid a type error, but we should probably convert this class to something else
  public useless: boolean
}
