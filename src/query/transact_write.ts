import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'

// this is limit of dynamoDB
const MAX_ITEMS = 25

export async function transactWrite(
  documentClient: DynamoDB,
  requests: DynamoDB.TransactWriteItem[],
) {
  try {
    const results = await Promise.all(
      _.chunk(requests, MAX_ITEMS)
        .map(async (chunk) => {
          const res =
            await documentClient.transactWriteItems(
                {
                  TransactItems: [...chunk],
                },
            ).promise()
          return res
        }),
    )

    return results
  } catch (e) {
    // tslint:disable-next-line
    console.log(`Dynamo-Types TransactWrite - ${JSON.stringify(requests, null, 2)}`)
    throw e
  }
}
