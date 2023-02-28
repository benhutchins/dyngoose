import { DynamoDB, TransactWriteItemsOutput, TransactWriteItem } from '@aws-sdk/client-dynamodb'
import { chunk as _chunk } from 'lodash'

// this is limit of dynamoDB
const MAX_ITEMS = 25

export async function transactWrite(
  documentClient: DynamoDB,
  requests: TransactWriteItem[],
): Promise<TransactWriteItemsOutput> {
  const chunks = _chunk(requests, MAX_ITEMS)
  await Promise.all(
    chunks.map(async (chunk) => {
      return await documentClient.transactWriteItems({
        TransactItems: [...chunk],
      })
    }),
  )

  // there is nothing to merge because we do not ask for ConsumedCapacity or ItemCollectionMetrics
  const output: TransactWriteItemsOutput = {}
  return output
}
