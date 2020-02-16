import { Schema } from './schema'

export async function createTable(schema: Schema, waitForReady = true) {
  const res = await schema.dynamo.createTable(schema.createTableInput()).promise()

  if (waitForReady) {
    await schema.dynamo.waitFor('tableExists', { TableName: schema.name }).promise()

    // TTL
    if (schema.timeToLiveAttribute) {
      await schema.dynamo.updateTimeToLive({
        TableName: schema.name,
        TimeToLiveSpecification: {
          Enabled: true,
          AttributeName: schema.timeToLiveAttribute.name,
        },
      }).promise()
    }
  }

  return res.TableDescription
}
