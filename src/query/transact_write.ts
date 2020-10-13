import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'


export async function transactWrite(
  documentClient: DynamoDB,
  requests: DynamoDB.TransactWriteItem[],
) {
  try {
    const results = await Promise.all(
      requests
        .map(async () => {
          const res =
            await documentClient.transactWriteItems(
                {
                    TransactItems:[...requests]
                }
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
