import {
  type CreateGlobalSecondaryIndexAction,
  type GlobalSecondaryIndexDescription,
  type GlobalSecondaryIndexUpdate,
  type TableDescription,
  type UpdateTableInput,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb'
import * as _ from 'lodash'
import { SchemaError } from '../errors'
import { createTable } from './create-table'
import { describeTable } from './describe-table'
import { type Schema } from './schema'

export async function migrateTable(schema: Schema, waitForReady = false): Promise<TableDescription> {
  let description: TableDescription

  try {
    description = await describeTable(schema)
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      return await createTable(schema, waitForReady)
    } else {
      throw err
    }
  }

  const expectedDescription = schema.createTableInput()
  const indexes: string[] = []
  const expectedIndexes: string[] = []

  if (description.GlobalSecondaryIndexes != null) {
    description.GlobalSecondaryIndexes.forEach((index) => {
      if (index.IndexName != null) {
        indexes.push(index.IndexName)
      }
    })
  }

  if (expectedDescription.GlobalSecondaryIndexes != null) {
    expectedDescription.GlobalSecondaryIndexes.forEach((index) => {
      if (index.IndexName != null) {
        expectedIndexes.push(index.IndexName)
      }
    })
  }

  const deletedIndexes: GlobalSecondaryIndexDescription[] = []
  let hasChanges = indexes.length < expectedIndexes.length

  if (!hasChanges) {
    _.each(description.GlobalSecondaryIndexes, (oldIndex) => {
      const newIndex = _.find(expectedDescription.GlobalSecondaryIndexes, i => i.IndexName === oldIndex.IndexName)

      if (newIndex == null) {
        deletedIndexes.push(oldIndex)
        hasChanges = true
      } else if (!_.isEqual(oldIndex.KeySchema, newIndex.KeySchema) || !_.isEqual(oldIndex.Projection, newIndex.Projection)) {
        const oldIndexName = oldIndex.IndexName == null ? '' : oldIndex.IndexName
        // you can only updated ProvisionedThroughput, which is useless to do on the DynamoDB development server
        // so really we want to verify we're not attempting to change an index's KeySchema or Projection, if we
        // are, error and warn developer… they need to rename the index so the old one is deleted
        throw new SchemaError(`Cannot update KeySchema or Projection for ${oldIndexName}, you must rename the index to delete the one and create a new one`)
      }
    })
  }

  if (hasChanges) {
    const newIndexes = _.filter(expectedDescription.GlobalSecondaryIndexes, (index) => {
      return !_.includes(indexes, index.IndexName)
    })

    const indexUpdates: GlobalSecondaryIndexUpdate[] = []

    _.forEach(deletedIndexes, (index) => {
      if (index.IndexName != null) {
        indexUpdates.push({ Delete: { IndexName: index.IndexName } })
      }
    })

    _.forEach(newIndexes, (index) => {
      const action: CreateGlobalSecondaryIndexAction = index
      indexUpdates.push({ Create: action })
    })

    // you can only update or delete a single index per request, even though the command accepts an array
    for (const indexUpdate of indexUpdates) {
      const updateParams: UpdateTableInput = {
        TableName: expectedDescription.TableName,
        AttributeDefinitions: expectedDescription.AttributeDefinitions,
        GlobalSecondaryIndexUpdates: [indexUpdate],
      }

      // tell the table to update this index
      await schema.dynamo.updateTable(updateParams)

      // now wait for the index to be ready
      await waitUntilTableExists({ client: schema.dynamo, maxWaitTime: 500 }, { TableName: schema.name })
    }

    // TTL
    const ttl = await schema.dynamo.describeTimeToLive({ TableName: schema.name })
    if (
      // if there currently is no TTL attribute but we want one
      (ttl.TimeToLiveDescription == null && schema.timeToLiveAttribute != null) ||
      // or if the TTL attribute has changed
      (ttl.TimeToLiveDescription != null && schema.timeToLiveAttribute != null && ttl.TimeToLiveDescription.AttributeName !== schema.timeToLiveAttribute.name)
      // TODO: if there is a TTL attribute but we no longer want one, we should delete it
    ) {
      await schema.dynamo.updateTimeToLive({
        TableName: schema.name,
        TimeToLiveSpecification: {
          Enabled: true,
          AttributeName: schema.timeToLiveAttribute.name,
        },
      })
    }
  }

  return description
}
