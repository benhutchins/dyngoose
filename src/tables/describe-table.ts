import type { DescribeTableCommandInput, TableDescription } from '@aws-sdk/client-dynamodb'

import type { IRequestOptions } from '../connections'
import type { Schema } from './schema'

export async function describeTable(schema: Schema, requestOptions?: IRequestOptions): Promise<TableDescription> {
  const params: DescribeTableCommandInput = {
    TableName: schema.name,
  }

  const result = await schema.dynamo.describeTable(params, requestOptions)
  return result.Table!
}
