import { type TableDescription, waitUntilTableExists } from '@aws-sdk/client-dynamodb'

import type { Schema } from './schema'

export async function createTable(schema: Schema, waitForReady = true): Promise<TableDescription> {
  const res = await schema.dynamo.createTable(schema.createTableInput())

  if (waitForReady) {
    await waitUntilTableExists({ client: schema.dynamo, maxWaitTime: 500 }, { TableName: schema.name })

    // TTL
    if (schema.timeToLiveAttribute != null) {
      await schema.dynamo.updateTimeToLive({
        TableName: schema.name,
        TimeToLiveSpecification: {
          Enabled: true,
          AttributeName: schema.timeToLiveAttribute.name,
        },
      })
    }

    // Point-in-Time Recovery
    if (schema.options.backup === true) {
      await schema.dynamo.updateContinuousBackups({
        TableName: schema.name,
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      })
    }
  }

  return res.TableDescription!
}
