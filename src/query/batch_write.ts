import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'

// this is limit of dynamoDB
const MAX_ITEMS = 25

export async function batchWrite(
  documentClient: DynamoDB,
  tableName: string,
  requests: DynamoDB.WriteRequest[],
) {
  try {
    const results = await Promise.all(
      _.chunk(requests, MAX_ITEMS)
        .map(async (chunk) => {
          const res =
            await documentClient.batchWriteItem({
              RequestItems: {
                [tableName]: chunk,
              },
            }).promise()
          return res
        }),
    )

    return results
  } catch (e) {
    // tslint:disable-next-line
    console.log(`Dynamo-Types batchWrite - ${JSON.stringify(requests, null, 2)}`)
    throw e
  }
}
