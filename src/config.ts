import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { type Connection, DynamoDBConnection } from './connections'

/**
 * This acts as a Singleton class to provide the default DynamoDB Client to
 * tables when it does not have an explicit connection provided in the table's
 * metadata.
 */
export default class Config {
  private static __defaultConnection: Connection

  public static get defaultConnection(): Connection {
    if (this.__defaultConnection == null) {
      let credentials: { accessKeyId: string, secretAccessKey: string } | undefined

      if (typeof process.env.DYNAMO_ACCESS_KEY_ID === 'string' && typeof process.env.DYNAMO_SECRET_ACCESS_KEY === 'string') {
        credentials = {
          accessKeyId: process.env.DYNAMO_ACCESS_KEY_ID,
          secretAccessKey: process.env.DYNAMO_SECRET_ACCESS_KEY,
        }
      }

      this.__defaultConnection = new DynamoDBConnection({
        endpoint: process.env.DYNAMO_ENDPOINT,
        region: process.env.DYNAMO_REGION,
        enableAWSXray: process.env.ENABLE_XRAY === 'true',
        credentials,
      })
    }
    return this.__defaultConnection
  }

  public static set defaultConnection(connection: Connection | DynamoDB) {
    if (connection instanceof DynamoDB) {
      this.__defaultConnection = { client: connection }
    } else {
      this.__defaultConnection = connection
    }
  }

  // this is to avoid a type error, but we should probably convert this class to something else
  public useless: boolean
}
