import { DescribeTableCommandInput, TableDescription } from '@aws-sdk/client-dynamodb'
import { Schema } from './schema'

export async function describeTable(schema: Schema): Promise<TableDescription> {
  const params: DescribeTableCommandInput = {
    TableName: schema.name,
  }

  const result = await schema.dynamo.describeTable(params)
  return result.Table as TableDescription
}
