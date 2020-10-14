import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'

// this is limit of dynamoDB
const MAX_ITEMS = 25

export async function batchWrite(
  documentClient: DynamoDB,
  requests: DynamoDB.BatchWriteItemRequestMap[],
) {
  try {
    const results = await Promise.all(
      _.chunk(requests, MAX_ITEMS)
        .map(async (chunk) => {
          const mergedMap: DynamoDB.BatchWriteItemRequestMap = {}

          for (const requestMap of chunk) {
            for (const tableName of Object.keys(requestMap)) {
              const request = requestMap[tableName]

              if (mergedMap[tableName]) {
                mergedMap[tableName] = mergedMap[tableName].concat(request)
              } else {
                mergedMap[tableName] = request
              }
            }
          }

          const res =
            await documentClient.batchWriteItem({
              RequestItems: mergedMap,
            }).promise()
          return res
        }),
    )

    return results
  } catch (e) {
    throw e
  }
}
