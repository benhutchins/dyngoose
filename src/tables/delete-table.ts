import { type TableDescription } from '@aws-sdk/client-dynamodb'
import { type Schema } from './schema'

export async function deleteTable(schema: Schema): Promise<TableDescription | undefined> {
  const res = await schema.dynamo.deleteTable({ TableName: schema.name })
  return res.TableDescription
}
