import { DynamoDB } from 'aws-sdk'
import { Schema } from './schema'

export async function describeTable(schema: Schema) {
  const params: DynamoDB.DescribeTableInput = {
    TableName: schema.name,
  }

  const result = await schema.dynamo.describeTable(params).promise()
  return result.Table as DynamoDB.TableDescription
}
