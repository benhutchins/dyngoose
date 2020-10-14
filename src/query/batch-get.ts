import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'

// this is limit of dynamoDB
const MAX_ITEMS = 100

export async function batchGet(
  documentClient: DynamoDB,
  tableName: string,
  keys: DynamoDB.KeyList,
): Promise<DynamoDB.AttributeMap[]> {
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
                if (!_.isEqual(record[keyName], key[keyName])) {
                  return false
                }
              }
              return true
            })
          })
        }),
    ).then((chunks) => {
      return _.filter(_.flatten(chunks)) as DynamoDB.AttributeMap[]
    })
  } catch (e) {
    throw e
  }
}
