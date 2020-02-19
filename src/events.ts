import { DynamoDB } from 'aws-sdk'

export interface AfterSaveEvent {
  type: 'put' | 'update'
  output: DynamoDB.PutItemOutput | DynamoDB.UpdateItemOutput
  meta?: any
  deletedAttributes: string[]
  updatedAttributes: string[]
}
