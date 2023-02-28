import { BatchWriteItemOutput, DynamoDB, WriteRequest } from '@aws-sdk/client-dynamodb'
import { chunk } from 'lodash'

// this is limit of dynamoDB
const MAX_ITEMS = 25

/**
 * [tableName]: WriteRequests[]
 */
export type WriteRequestMap = Record<string, WriteRequest[]>

export async function batchWrite(
  documentClient: DynamoDB,
  requests: WriteRequestMap[],
): Promise<BatchWriteItemOutput> {
  const results = await Promise.all(
    chunk(requests, MAX_ITEMS).map(async (chunk) => {
      const mergedMap: Record<string, WriteRequest[]> = {}

      for (const requestMap of chunk) {
        for (const tableName of Object.keys(requestMap)) {
          const request = requestMap[tableName]

          if (mergedMap[tableName] == null) {
            mergedMap[tableName] = request
          } else {
            mergedMap[tableName] = mergedMap[tableName].concat(request)
          }
        }
      }

      const res: BatchWriteItemOutput = await documentClient.batchWriteItem({ RequestItems: mergedMap })
      return res
    }),
  )

  // merge together the outputs to unify the UnprocessedItems into a single output array
  const output: BatchWriteItemOutput = {}

  for (const result of results) {
    if (result.UnprocessedItems != null) {
      if (output.UnprocessedItems == null) {
        output.UnprocessedItems = {}
      }

      for (const tableName of Object.keys(result.UnprocessedItems)) {
        if (output.UnprocessedItems[tableName] == null) {
          output.UnprocessedItems[tableName] = []
        }

        output.UnprocessedItems[tableName] = output.UnprocessedItems[tableName].concat(result.UnprocessedItems[tableName])
      }
    }
  }

  return output
}
