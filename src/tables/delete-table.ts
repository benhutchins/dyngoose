import { DynamoDB } from 'aws-sdk'
import { Schema } from './schema'

export async function deleteTable(schema: Schema): Promise<DynamoDB.TableDescription | undefined> {
  const res = await schema.dynamo.deleteTable({ TableName: schema.name }).promise()
  return res.TableDescription
}
