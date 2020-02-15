import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import { describeTable } from './describe-table'
import { Schema } from './schema'

export async function migrateTable(schema: Schema, waitForReady = false) {
  let description: DynamoDB.TableDescription

  try {
    description = await describeTable(schema)
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      return await this.createTable(waitForReady)
    } else {
      throw err
    }
  }

  const expectedDescription = schema.createTableInput()

  const indexes = _.map(description.GlobalSecondaryIndexes || [], 'IndexName') as string[]
  const expectedIndexes = _.map(expectedDescription.GlobalSecondaryIndexes || [], 'IndexName') as string[]
  // const updatedIndexes: DynamoDB.GlobalSecondaryIndex[] = []
  const deletedIndexes: DynamoDB.GlobalSecondaryIndexDescriptionList = []
  let hasChanges = indexes.length < expectedIndexes.length

  if (!hasChanges) {
    _.each(description.GlobalSecondaryIndexes, (oldIndex) => {
      const newIndex = _.find(expectedDescription.GlobalSecondaryIndexes, i => i.IndexName === oldIndex.IndexName)

      if (!newIndex) {
        deletedIndexes.push(oldIndex)
        hasChanges = true
      } else if (!_.isEqual(oldIndex.KeySchema, newIndex.KeySchema) || !_.isEqual(oldIndex.Projection, newIndex.Projection)) {
        // you can only updated ProvisionedThroughput, which is useless to do on the DynamoDB development server
        // so really we want to verify we're not attempting to change an index's KeySchema or Projection, if we
        // are, error and warn developer… they need to rename the index so the old one is deleted
        throw new Error(`Cannot update KeySchema or Projection for ${oldIndex.IndexName}, you must rename the index to delete the one and create a new one`)
      }
    })
  }

  if (hasChanges) {
    const newIndexes = _.filter(expectedDescription.GlobalSecondaryIndexes, (index) => {
      return !_.includes(indexes, index.IndexName)
    })

    const indexUpdates: DynamoDB.GlobalSecondaryIndexUpdate[] = []

    _.forEach(deletedIndexes, (index) => {
      if (index.IndexName) {
        indexUpdates.push({ Delete: { IndexName: index.IndexName } })
      }
    })

    _.forEach(newIndexes, (index) => {
      const action: DynamoDB.CreateGlobalSecondaryIndexAction = index
      indexUpdates.push({ Create: action })
    })

    // you can only update or delete a single index per request, even though the command accepts an array
    for (const indexUpdate of indexUpdates) {
      const updateParams: DynamoDB.UpdateTableInput = {
        TableName: expectedDescription.TableName,
        AttributeDefinitions: expectedDescription.AttributeDefinitions,
        GlobalSecondaryIndexUpdates: [indexUpdate],
      }

      // tell the table to update this index
      await schema.dynamo.updateTable(updateParams).promise()

      // now wait for the index to be ready
      await schema.dynamo.waitFor('tableExists', { TableName: schema.name }).promise()
    }

    // TTL
    // if (schema.timeToLiveAttribute) {
    //   await schema.dynamo.updateTimeToLive({
    //     TableName: schema.name,
    //     TimeToLiveSpecification: {
    //       Enabled: true,
    //       AttributeName: schema.timeToLiveAttribute.name,
    //     },
    //   }).promise()
    // }
  }

  return description
}
