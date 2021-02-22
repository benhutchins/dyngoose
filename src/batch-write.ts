import { DynamoDB } from 'aws-sdk'
import { RateLimit } from 'async-sema'
import * as _ from 'lodash'
import Config from './config'
import { Table } from './table'
import { BatchError, HelpfulError } from './errors'

export class BatchWrite {
  public static readonly MAX_BATCH_ITEMS = 25 // limit imposed by DynamoDB
  public static readonly MAX_PARALLEL_WRITES = 25 // 25 concurrent writes of 25 records is a lot…

  private dynamo: DynamoDB
  private readonly list: DynamoDB.BatchWriteItemRequestMap[] = []

  /**
   * Perform a BatchWrite operation.
   *
   * @see {@link https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html}
   *
   * A Batch operation puts or deletes multiple items in one or more tables.
   *
   * The individual `PutItem` and `DeleteItem` operations specified in batch operation are atomic,
   * however, the whole batch operation is not atomic. This means that some puts and deletes can
   * be successful and others can fail.
   *
   * To perform an atomic operation, use `Dyngoose.Transaction`. Additionally, BatchWrites cannot
   * update partial items, however, TransactWrites can.
   *
   * Uses a semaphore to limit parallel writes.
   *
   * @param {DynamoDB} connection You can optionally specify the DynamoDB connection to utilize.
   * @see {@link https://github.com/benhutchins/dyngoose/blob/master/docs/Connections.md}.
   */
  constructor(private readonly options: {
    connection?: DynamoDB
    maxItemsPerBatch?: number

    /**
     * Dyngoose.BatchWrite uses a semaphore to limit parallel writes.
     * Specify the number of parallel operations you'd like to consume.
     * Default is `25`.
     */
    maxParallelWrites?: number

    /**
     * Stop future chunks and parallel writes if an exception is encountered.
     * Outputs that contain UnprocessedItems, such as due to provisioned throughout exceptions.
     * True by default. Set to false to disable.
    */
    breakOnException?: boolean
  } = {}) {
    this.dynamo = options.connection == null ? Config.defaultConnection.client : options.connection

    if (this.options.maxItemsPerBatch != null && this.options.maxItemsPerBatch > BatchWrite.MAX_BATCH_ITEMS) {
      throw new Error(`maxItemsPerBatch cannot be greater than ${BatchWrite.MAX_BATCH_ITEMS}`)
    }
  }

  public setConnection(dynamo: DynamoDB): this {
    this.dynamo = dynamo
    return this
  }

  public put<T extends Table>(...records: T[]): this {
    for (const record of records) {
      const tableClass = record.constructor as typeof Table
      const requestMap: DynamoDB.BatchWriteItemRequestMap = {
        [tableClass.schema.name]: [
          {
            PutRequest: {
              Item: record.toDynamo(),
            },
          },
        ],
      }

      this.list.push(requestMap)
    }

    return this
  }

  public delete<T extends Table>(...records: T[]): this {
    for (const record of records) {
      const tableClass = record.constructor as typeof Table
      const requestMap: DynamoDB.BatchWriteItemRequestMap = {
        [tableClass.schema.name]: [
          {
            DeleteRequest: {
              Key: record.getDynamoKey(),
            },
          },
        ],
      }

      this.list.push(requestMap)
    }

    return this
  }

  public async commit(): Promise<DynamoDB.BatchWriteItemOutput> {
    const limit = RateLimit(this.options.maxParallelWrites == null ? BatchWrite.MAX_PARALLEL_WRITES : this.options.maxParallelWrites)
    const chunks = _.chunk(this.list, this.options.maxItemsPerBatch == null ? BatchWrite.MAX_BATCH_ITEMS : this.options.maxItemsPerBatch)
    const exceptions: HelpfulError[] = []

    const promises = chunks.map(async (chunk) => {
      // Wait if the maximum amount of parallel writes has been reached
      await limit()

      // If previous batches have already had an exception, then stop and do not continue
      if (exceptions.length > 0 && this.options.breakOnException !== false) {
        return
      }

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

      try {
        return await this.dynamo.batchWriteItem({ RequestItems: mergedMap }).promise()
      } catch (ex) {
        // save the exception to stop all future chunks, because without this the other chunks would continue
        // this is not perfect, because operations that are in-progress will still continue, although they
        // might fail as well for the same reason as the first exception
        exceptions.push(new HelpfulError(ex))
      }
    })

    const results = _.filter(await Promise.all(promises)) as DynamoDB.BatchWriteItemOutput[]

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

    // at this point, we might have some results and some exceptions
    if (exceptions.length > 0) {
      throw new BatchError('Some or all of your batch write operation failed', exceptions, output)
    }

    return output
  }
}
