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
      const request = documentClient.transactWriteItems({
        TransactItems: [...chunk],
      })

      // attempt to expose the cancellation reasons, giving the details on why the transaction failed
      // @see https://github.com/aws/aws-sdk-js/issues/2464
      request.on('extractError', (response) => {
        if (response.error != null) {
          try {
            const reasons = JSON.parse(response.httpResponse.body.toString()).CancellationReasons;
            (response.error as any).cancellationReasons = reasons
          } catch (ex) {}
        }
      })

      return await request.promise()
    }),
  )

  // there is nothing to merge because we do not ask for ConsumedCapacity or ItemCollectionMetrics
  const output: DynamoDB.TransactWriteItemsOutput = {}
  return output
}
