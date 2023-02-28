import { DynamoDB } from '@aws-sdk/client-dynamodb'

export interface Connection {
  readonly client: DynamoDB
}
