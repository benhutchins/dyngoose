import { Schema } from './schema'

export async function deleteTable(schema: Schema) {
  const res = await schema.dynamo.deleteTable({ TableName: schema.name }).promise()
  return res.TableDescription
}
