import { type DescribeTableCommandInput, type TableDescription } from '@aws-sdk/client-dynamodb'
import { type Schema } from './schema'
import { type IRequestOptions } from '../connections'

export async function describeTable(schema: Schema, requestOptions?: IRequestOptions): Promise<TableDescription> {
  const params: DescribeTableCommandInput = {
    TableName: schema.name,
  }

  const result = await schema.dynamo.describeTable(params, requestOptions)
  return result.Table as TableDescription
}
