import { DynamoDB, TransactWriteItemsOutput, TransactWriteItem } from '@aws-sdk/client-dynamodb'
import { chunk } from 'lodash'

// this is limit of dynamoDB
const MAX_ITEMS = 25

export async function transactWrite(
  documentClient: DynamoDB,
  requests: TransactWriteItem[],
): Promise<TransactWriteItemsOutput> {
  const chunks = chunk(requests, MAX_ITEMS)
  await Promise.all(
    chunks.map(async (transactItems) => {
      return await documentClient.transactWriteItems({
        TransactItems: transactItems,
      })
    }),
  )

  // there is nothing to merge because we do not ask for ConsumedCapacity or ItemCollectionMetrics
  const output: TransactWriteItemsOutput = {}
  return output
}
