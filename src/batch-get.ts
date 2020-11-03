import { flatten, filter, isEqual, chunk } from 'lodash'
import { DynamoDB } from 'aws-sdk'
import Config from './config'
import { Table } from './table'
import { buildProjectionExpression } from './query/projection-expression'

export class BatchGet<T extends Table> {
  public static readonly MAX_ITEMS = 100

  private dynamo: DynamoDB
  private readonly items: T[] = []
  private readonly projectionMap: Map<typeof Table, string[]> = new Map()

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
    return await Promise.all(
      chunk(this.items, BatchGet.MAX_ITEMS).map(async (chunkedItems) => {
        const requestMap: DynamoDB.BatchGetRequestMap = {}

        for (const item of chunkedItems) {
          const tableClass = item.constructor as typeof Table

          if (requestMap[tableClass.schema.name] == null) {
            requestMap[tableClass.schema.name] = {
              Keys: [],
            }

            if (this.projectionMap.has(tableClass)) {
              const attributes = this.projectionMap.get(tableClass)
              if (attributes != null) {
                const expression = buildProjectionExpression(tableClass, attributes)
                requestMap[tableClass.schema.name].ProjectionExpression = expression.ProjectionExpression
                requestMap[tableClass.schema.name].ExpressionAttributeNames = expression.ExpressionAttributeNames
              }
            }
          }

          requestMap[tableClass.schema.name].Keys.push(item.getDynamoKey())
        }

        const res = await this.dynamo.batchGetItem({
          RequestItems: requestMap,
        }).promise()

        if (res.Responses == null) {
          return []
        }

        return chunkedItems.map((item) => {
          const tableClass = item.constructor as typeof Table
          const records = res.Responses == null ? [] : res.Responses[tableClass.schema.name]
          const key = item.getDynamoKey()
          const attributeMap = records.find((record) => {
            for (const keyName of Object.keys(key)) {
              if (!isEqual(record[keyName], key[keyName])) {
                return false
              }
            }
            return true
          })

          if (attributeMap != null) {
            item.fromDynamo(attributeMap)
          }

          return item
        })
      }),
    ).then((chunks) => {
      return filter(flatten(chunks))
    })
  }

  public async retrieveMapped(): Promise<Map<typeof Table, T[]>> {
    const items = await this.retrieve()
    const map: Map<typeof Table, T[]> = new Map()

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
