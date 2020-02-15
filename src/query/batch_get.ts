import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'

// this is limit of dynamoDB
const MAX_ITEMS = 100

export async function batchGet(
  documentClient: DynamoDB,
  tableName: string,
  keys: DynamoDB.KeyList,
) {
  try {
    return await Promise.all(
      _.chunk(keys, MAX_ITEMS)
        .map(async (chunkedKeys) => {
          const res =
            await documentClient.batchGetItem({
              RequestItems: {
                [tableName]: {
                  Keys: chunkedKeys,
                },
              },
            }).promise()

          const records = res.Responses ? res.Responses[tableName] : []

          return chunkedKeys.map((key) => {
            return records.find((record) => {
              for (const keyName of Object.keys(key)) {
                if (record[keyName] !== key[keyName]) {
                  return false
                }
              }
              return true
            })
          })
        }),
    ).then((chunks) => {
      return _.flatten(chunks)
    })
  } catch (e) {
    // tslint:disable-next-line
    console.log(`Dynamo-Types batchGet - ${JSON.stringify(keys, null, 2)}`);
    throw e
  }
}
