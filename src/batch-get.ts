import { flatten, filter, isArray, isEqual, chunk } from 'lodash'
import { type BatchGetItemOutput, type DynamoDB, type Get, type KeysAndAttributes, type TransactGetItem, type TransactGetItemsOutput } from '@aws-sdk/client-dynamodb'
import Config from './config'
import { type Table } from './table'
import { buildProjectionExpression } from './query/projection-expression'
import { HelpfulError } from './errors'
import { type AttributeMap } from './interfaces'

export class BatchGet<T extends Table> {
  public static readonly MAX_BATCH_ITEMS = 100
  public static readonly MAX_TRANSACT_ITEMS = 25

  private dynamo: DynamoDB
  private readonly items: T[] = []
  private readonly projectionMap = new Map<typeof Table, string[]>()
  private atomicity = false

  /**
   * Perform a BatchGet operation.
   *
   * @see {@link https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchGetItem.html}
   *
   * A BatchGet operation retrieves multiple from multiple tables in one operation.
   *
   * There is a limit of 16MB and 100 items we request. Dyngoose will automatically chunk requests
   * and will perform several operations if requesting more than 100 items, however, it is possible
   * requests can fail due to the 16MB of data limitation.
   *
   * It is possible for the request to partially fail and some items will not be retrieved, these
   * items will be specified under UnprocessedKeys.
   *
   * @param {DynamoDB} connection You can optionally specify the DynamoDB connection to utilize.
   * @see {@link https://github.com/benhutchins/dyngoose/blob/master/docs/Connections.md}.
   */
  constructor(connection?: DynamoDB) {
    this.dynamo = connection == null ? Config.defaultConnection.client : connection
  }

  public setConnection(dynamo: DynamoDB): this {
    this.dynamo = dynamo
    return this
  }

  public atomic(): this {
    this.atomicity = true
    return this
  }

  public nonAtomic(): this {
    this.atomicity = false
    return this
  }

  public get(...records: T[]): this {
    this.items.push(...records)
    return this
  }

  /**
   * By default, DynamoDB will retrieve the entire item during a BatchGet.
   * That can rapidly become a lot of data.
   *
   * To be more selective, you can specify which attributes you'd like to retrieve
   * from DynamoDB by specifying them. Dyngoose will turn your specified list into
   * a ProjectionExpression automatically.
  */
  public getSpecificAttributes(tableClass: typeof Table, ...attributes: string[]): this {
    this.projectionMap.set(tableClass, attributes)
    return this
  }

  public async retrieve(): Promise<T[]> {
    const chunkSize = this.atomicity ? BatchGet.MAX_TRANSACT_ITEMS : BatchGet.MAX_BATCH_ITEMS
    return await Promise.all(
      chunk(this.items, chunkSize).map(async (chunkedItems) => {
        const requestMap: Record<string, KeysAndAttributes> = {}
        const transactItems: TransactGetItem[] = []

        for (const item of chunkedItems) {
          const tableClass = item.constructor as typeof Table
          const attributes = this.projectionMap.get(tableClass)
          const expression = attributes == null ? null : buildProjectionExpression(tableClass, attributes)

          if (this.atomicity) {
            const transactItem: Get = {
              Key: item.getDynamoKey(),
              TableName: tableClass.schema.name,
            }

            if (expression != null) {
              transactItem.ProjectionExpression = expression.ProjectionExpression
              transactItem.ExpressionAttributeNames = expression.ExpressionAttributeNames
            }

            transactItems.push({
              Get: transactItem,
            })
          } else {
            if (requestMap[tableClass.schema.name] == null) {
              requestMap[tableClass.schema.name] = {
                Keys: [],
              }
            }

            requestMap[tableClass.schema.name].Keys!.push(item.getDynamoKey())

            if (expression != null) {
              requestMap[tableClass.schema.name].ProjectionExpression = expression.ProjectionExpression
              requestMap[tableClass.schema.name].ExpressionAttributeNames = expression.ExpressionAttributeNames
            }
          }
        }

        let output: TransactGetItemsOutput | BatchGetItemOutput

        try {
          if (this.atomicity) {
            output = await this.dynamo.transactGetItems({
              TransactItems: transactItems,
            })
          } else {
            output = await this.dynamo.batchGetItem({
              RequestItems: requestMap,
            })
          }
        } catch (ex) {
          throw new HelpfulError(ex)
        }

        const responses = output.Responses == null ? [] : output.Responses

        if (responses.length === 0) {
          return []
        }

        const items = chunkedItems.map((item) => {
          const tableClass = item.constructor as typeof Table
          const key = item.getDynamoKey()
          let attributeMap: AttributeMap | undefined
          if (isArray(responses)) {
            const itemResponse = responses.find((record) => {
              if (record.Item == null) {
                return false
              }

              for (const keyName of Object.keys(key)) {
                if (!isEqual(record.Item[keyName], key[keyName])) {
                  return false
                }
              }
              return true
            })

            if (itemResponse?.Item != null) {
              attributeMap = itemResponse?.Item
            }
          } else {
            const records = responses[tableClass.schema.name]
            attributeMap = records.find((record) => {
              for (const keyName of Object.keys(key)) {
                if (!isEqual(record[keyName], key[keyName])) {
                  return false
                }
              }
              return true
            })
          }

          if (attributeMap == null) {
            return null
          } else {
            item.fromDynamo(attributeMap)
            return item
          }
        })

        return filter(items) as T[]
      }),
    ).then((chunks) => {
      return filter(flatten(chunks))
    })
  }

  public async retrieveMapped(): Promise<Map<typeof Table, T[]>> {
    const items = await this.retrieve()
    const map = new Map<typeof Table, T[]>()

    for (const item of items) {
      const tableClass = item.constructor as typeof Table

      let tableItems = map.get(tableClass)

      if (tableItems == null) {
        tableItems = []
      }

      tableItems.push(item)
      map.set(tableClass, tableItems)
    }

    return map
  }
}
