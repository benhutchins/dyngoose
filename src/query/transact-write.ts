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
      const request = await documentClient.transactWriteItems({
        TransactItems: [...chunk],
      })

      // attempt to expose the cancellation reasons, giving the details on why the transaction failed
      // @see https://github.com/aws/aws-sdk-js/issues/2464
      // request.on('extractError', (response) => {
      //   if (response.error != null) {
      //     try {
      //       const reasons = JSON.parse(response.httpResponse.body.toString()).CancellationReasons;
      //       (response.error as any).cancellationReasons = reasons
      //     } catch (ex) {}
      //   }
      // })

      return request
    }),
  )

  // there is nothing to merge because we do not ask for ConsumedCapacity or ItemCollectionMetrics
  const output: TransactWriteItemsOutput = {}
  return output
}
