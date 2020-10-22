import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'

// this is limit of dynamoDB
const MAX_ITEMS = 25

export async function transactWrite(
  documentClient: DynamoDB,
  requests: DynamoDB.TransactWriteItem[],
): Promise<DynamoDB.TransactWriteItemsOutput> {
  await Promise.all(
    _.chunk(requests, MAX_ITEMS).map(async (chunk) => {
      const res: DynamoDB.TransactWriteItemsOutput = await documentClient.transactWriteItems({
        TransactItems: [...chunk],
      }).promise()
      return res
    }),
  )

  // there is nothing to merge because we do not ask for ConsumedCapacity or ItemCollectionMetrics
  const output: DynamoDB.TransactWriteItemsOutput = {}
  return output
}
