import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'

// this is limit of dynamoDB
const MAX_ITEMS = 25

export async function batchWrite(
  documentClient: DynamoDB,
  requests: DynamoDB.BatchWriteItemRequestMap[],
): Promise<DynamoDB.BatchWriteItemOutput> {
  const results = await Promise.all(
    _.chunk(requests, MAX_ITEMS).map(async (chunk) => {
      const mergedMap: DynamoDB.BatchWriteItemRequestMap = {}

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

      const res: DynamoDB.BatchWriteItemOutput = await documentClient.batchWriteItem({ RequestItems: mergedMap }).promise()
      return res
    }),
  )

  // merge together the outputs to unify the UnprocessedItems into a single output array
  const output: DynamoDB.BatchWriteItemOutput = {}

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
