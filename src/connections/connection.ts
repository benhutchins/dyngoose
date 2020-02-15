import { DynamoDB } from 'aws-sdk'

export interface Connection {
  readonly client: DynamoDB
}
