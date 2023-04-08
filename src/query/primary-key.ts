import { type BatchWriteItemOutput, type DeleteItemInput, type DeleteItemOutput, type DeleteRequest, type GetItemInput, type GetItemOutput, type QueryCommandInput, type QueryCommandOutput, type ReturnConsumedCapacity, type ScanCommandInput, type ScanCommandOutput, type WriteRequest } from '@aws-sdk/client-dynamodb'
import { get, has, isArray, isDate, isObject } from 'lodash'
import { BatchGet } from '../batch-get'
import { HelpfulError, QueryError } from '../errors'
import { type AttributeMap } from '../interfaces'
import { type Key } from '../interfaces/key.interface'
import type * as Metadata from '../metadata'
import { type ITable, type Table } from '../table'
import { type TableProperties } from '../tables/properties'
import { isDyngooseTableInstance } from '../utils/is'
import { batchWrite, type WriteRequestMap } from './batch-write'
import { buildQueryExpression } from './expression'
import { type Filters as QueryFilters, type UpdateConditions } from './filters'
import { QueryOutput } from './output'
import { buildProjectionExpression } from './projection-expression'
import { MagicSearch, type MagicSearchInput } from './search'

type PrimaryKeyType = string | number | Date
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type RangePrimaryKeyType = PrimaryKeyType | void

type PrimaryKeyBatchInput<HashKeyType extends PrimaryKeyType, RangeKeyType extends RangePrimaryKeyType> = [HashKeyType, RangeKeyType]

interface PrimaryKeyGetInput {
  projectionExpression?: string
  consistent?: boolean
  returnConsumedCapacity?: ReturnConsumedCapacity
}

interface PrimaryKeyGetGetItemInput extends PrimaryKeyGetInput {
  key: Key
}

interface PrimaryKeyQueryInput {
  rangeOrder?: 'ASC' | 'DESC'
  limit?: number
  exclusiveStartKey?: Key
  consistent?: boolean
  select?: 'COUNT'
}

interface PrimaryKeyUpdateItem<T extends Table, HashKeyType extends PrimaryKeyType, RangeKeyType extends RangePrimaryKeyType> {
  hash: HashKeyType
  range: RangeKeyType
  changes: TableProperties<T>
  conditions?: UpdateConditions<T>
}

interface PrimaryKeyScanInput {
  limit?: number
  totalSegments?: number
  segment?: number
  exclusiveStartKey?: Key
  attributes?: string[]
  projectionExpression?: string
  expressionAttributeNames?: Record<string, string>
}

/**
 * Determines if a given value is an accepted value for a hash or range key
 */
function isKeyValue(range: any): boolean {
  const type = typeof range
  return type === 'string' || type === 'boolean' || type === 'number' || type === 'bigint' || isDate(range)
}

export class PrimaryKey<T extends Table, HashKeyType extends PrimaryKeyType, RangeKeyType extends RangePrimaryKeyType = void> {
  constructor(
    readonly table: ITable<T>,
    readonly metadata: Metadata.Index.PrimaryKey,
  ) {}

  public getDeleteItemInput(hash: HashKeyType, range: RangeKeyType): DeleteItemInput {
    const input: DeleteItemInput = {
      TableName: this.table.schema.name,
      // ReturnValues: "ALL_OLD",
      Key: {
        [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(hash),
      },
    }

    if (this.metadata.range != null && input.Key != null) {
      input.Key[this.metadata.range.name] = this.metadata.range.toDynamoAssert(range)
    }

    return input
  }

  /**
   * Deletes an item from DynamoDB without having to load it from DynamoDB.
   * It is recommended you specify additional conditions to ensure you are deleting the record you assume.
   *
   * If you have already loaded the the record, you can use `Table.delete()`.
   *
   * Performs a `DeleteItem` operation.
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html
   */
  public async delete(hash: HashKeyType, range: RangeKeyType): Promise<DeleteItemOutput> {
    const input = this.getDeleteItemInput(hash, range)
    try {
      return await this.table.schema.dynamo.deleteItem(input)
    } catch (ex) {
      throw new HelpfulError(ex, this.table, input)
    }
  }

  public getGetInput(input: PrimaryKeyGetGetItemInput): GetItemInput {
    const getItemInput: GetItemInput = {
      TableName: this.table.schema.name,
      Key: input.key,
      ProjectionExpression: input.projectionExpression,
      ConsistentRead: input.consistent,
      ReturnConsumedCapacity: input.returnConsumedCapacity,
    }

    return getItemInput
  }

  /**
   * Get an item by its primary key (hash and range).
   *
   * `.get({ hashPropName: 'value', rangePropName: 'value' })`
   * `.get(hash, range)`
   *
   * This can be used to load the complete document, helpful if you current have a
   * projected version with only some attributes:
   *
   *   `.get(instanceOfTable)`
   */
  public async get(filters: QueryFilters<T>, input?: PrimaryKeyGetInput): Promise<T | undefined>
  public async get(hash: HashKeyType, range: RangeKeyType, input?: PrimaryKeyGetInput): Promise<T | undefined>
  public async get(record: T, input?: PrimaryKeyGetInput): Promise<T | undefined>
  public async get(hash: HashKeyType | T | QueryFilters<T>, range?: RangeKeyType | PrimaryKeyGetInput, input?: PrimaryKeyGetInput): Promise<T | undefined> {
    let record: T

    if (isDyngooseTableInstance(hash)) {
      record = hash
    } else if (isObject(hash) && !isKeyValue(hash)) {
      record = this.fromKey(hash)
    } else if (hash != null && (range == null || isKeyValue(range))) {
      record = this.fromKey(hash as HashKeyType, range as RangeKeyType)
    } else {
      throw new QueryError('PrimaryKey.get called with unknown arguments')
    }

    const getGetInput: Partial<PrimaryKeyGetGetItemInput> = input == null ? ((range == null || isKeyValue(range)) ? {} : range as PrimaryKeyGetInput) : input
    getGetInput.key = record.getDynamoKey()
    const getItemInput = this.getGetInput(getGetInput as PrimaryKeyGetGetItemInput)
    const hasProjection = getItemInput.ProjectionExpression == null
    let dynamoRecord: GetItemOutput

    try {
      dynamoRecord = await this.table.schema.dynamo.getItem(getItemInput)
    } catch (ex) {
      throw new HelpfulError(ex, this.table, getItemInput)
    }

    if (dynamoRecord.Item != null) {
      return this.table.fromDynamo(dynamoRecord.Item, !hasProjection)
    }
  }

  /**
   * Get a batch of items from this table
   *
   * This has been replaced with `Dyngoose.BatchGet` and should no longer be used.
   * `Dyngoose.BatchGet` has more functionality, supports projects and optionally atomic operations.
   *
   * @deprecated
   */
  public async batchGet(inputs: Array<PrimaryKeyBatchInput<HashKeyType, RangeKeyType>>): Promise<T[]> {
    const batch = new BatchGet<T>()

    for (const input of inputs) {
      batch.get(this.fromKey(input[0], input[1]))
    }

    return await batch.retrieve()
  }

  /**
   * Deletes several items at once.
   *
   * WARNING: This is not atomic.
   *          It is possible for some deletes to succeed with others fail.
   *          Use Dyngoose.Transaction to perform an atomic deletion.
   *
   * Internally, Dyngoose will chunk the request to bypass the DynamoDB limit of 100 items per batch write.
   *
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
   */
  public async batchDelete(inputs: Array<PrimaryKeyBatchInput<HashKeyType, RangeKeyType>>): Promise<BatchWriteItemOutput> {
    return await batchWrite(
      this.table.schema.dynamo,
      inputs.map((input) => {
        const deleteRequest: DeleteRequest = {
          Key: {
            [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(input[0]),
          },
        }

        if (this.metadata.range != null && deleteRequest.Key != null) {
          deleteRequest.Key[this.metadata.range.name] = this.metadata.range.toDynamoAssert(input[1])
        }

        const writeRequest: WriteRequest = {
          DeleteRequest: deleteRequest,
        }

        const requestMap: WriteRequestMap = {
          [this.table.schema.name]: [writeRequest],
        }

        return requestMap
      }),
    )
  }

  public getQueryInput(input: PrimaryKeyQueryInput = {}): QueryCommandInput {
    if (input.rangeOrder == null) {
      input.rangeOrder = 'ASC'
    }
    const ScanIndexForward = input.rangeOrder === 'ASC'
    const queryInput: QueryCommandInput = {
      TableName: this.table.schema.name,
      Limit: input.limit,
      ScanIndexForward,
      ExclusiveStartKey: input.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      ConsistentRead: input.consistent,
      Select: input.select,
    }

    return queryInput
  }

  public async query(filters: QueryFilters<T>, input?: PrimaryKeyQueryInput): Promise<QueryOutput<T>> {
    if (!has(filters, this.metadata.hash.propertyName)) {
      throw new QueryError('Cannot perform a query on the PrimaryKey index without specifying a hash key value')
    } else if (isArray(get(filters, this.metadata.hash.propertyName)) && get(filters, this.metadata.hash.propertyName)[0] !== '=') {
      throw new QueryError('DynamoDB only supports using equal operator for the HASH key')
    }

    const queryInput = this.getQueryInput(input)
    const hasProjection = queryInput.ProjectionExpression == null
    const expression = buildQueryExpression(this.table.schema, filters, this.metadata)
    queryInput.FilterExpression = expression.FilterExpression
    queryInput.KeyConditionExpression = expression.KeyConditionExpression
    queryInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
    queryInput.ExpressionAttributeValues = expression.ExpressionAttributeValues
    let output: QueryCommandOutput

    try {
      output = await this.table.schema.dynamo.query(queryInput)
    } catch (ex) {
      throw new HelpfulError(ex, this.table, queryInput)
    }

    return QueryOutput.fromDynamoOutput(this.table, output, hasProjection)
  }

  public getScanInput(input: PrimaryKeyScanInput = {}, filters?: QueryFilters<T>): ScanCommandInput {
    const scanInput: ScanCommandInput = {
      TableName: this.table.schema.name,
      Limit: input.limit,
      ExclusiveStartKey: input.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      TotalSegments: input.totalSegments,
      Segment: input.segment,
    }

    if (input.attributes != null && input.projectionExpression == null) {
      const expression = buildProjectionExpression(this.table, input.attributes)
      scanInput.ProjectionExpression = expression.ProjectionExpression
      scanInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
    } else if (input.projectionExpression != null) {
      scanInput.ProjectionExpression = input.projectionExpression
      scanInput.ExpressionAttributeNames = input.expressionAttributeNames
    }

    if (filters != null && Object.keys(filters).length > 0) {
      // don't pass the index metadata, avoids KeyConditionExpression
      const expression = buildQueryExpression(this.table.schema, filters)
      scanInput.FilterExpression = expression.FilterExpression
      scanInput.ExpressionAttributeValues = expression.ExpressionAttributeValues

      if (scanInput.ExpressionAttributeNames == null) {
        scanInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
      } else {
        Object.assign(scanInput.ExpressionAttributeNames, expression.ExpressionAttributeNames)
      }
    }

    return scanInput
  }

  public async scan(filters?: QueryFilters<T> | undefined | null, input?: PrimaryKeyScanInput): Promise<QueryOutput<T>> {
    const scanInput = this.getScanInput(input, filters == null ? undefined : filters)
    let output: ScanCommandOutput
    try {
      output = await this.table.schema.dynamo.scan(scanInput)
    } catch (ex) {
      throw new HelpfulError(ex, this.table, scanInput)
    }
    const hasProjection = scanInput.ProjectionExpression == null
    return QueryOutput.fromDynamoOutput(this.table, output, hasProjection)
  }

  /**
   * Query DynamoDB for what you need.
   *
   * Starts a MagicSearch using this GlobalSecondaryIndex.
   */
  public search(filters?: QueryFilters<T>, input: MagicSearchInput<T> = {}): MagicSearch<T> {
    return new MagicSearch<T>(this.table as any, filters, input).using(this)
  }

  /**
   * Creates an instance of Table based on the key.
   *
   * Internally the record will be marked as existing, so when performing a .save() operation
   * it will use an UpdateItem operation which will only transmit the updated fields.
   *
   * This can lead to race conditions if not used properly. Try to use with save conditions.
   */
  public fromKey(filters: QueryFilters<T>): T
  public fromKey(hash: HashKeyType, range: RangeKeyType): T
  public fromKey(hash: QueryFilters<T> | HashKeyType, range?: RangeKeyType): T {
    // if the hash was passed a query filters, then extract the hash and range
    if (isObject(hash) && !isDate(hash)) {
      const filters = hash
      if (!has(filters, this.metadata.hash.propertyName)) {
        throw new QueryError('Cannot perform .get() on a PrimaryKey without specifying a hash key value')
      } else if (this.metadata.range != null && !has(filters, this.metadata.range.propertyName)) {
        throw new QueryError('Cannot perform .get() on a PrimaryKey with a range key without specifying a range value')
      } else if (Object.keys(filters).length > 2) {
        throw new QueryError('Cannot perform a .get() on a PrimaryKey with additional filters, use .query() instead')
      }

      hash = get(filters, this.metadata.hash.propertyName)

      if (isArray(hash)) {
        if (hash[0] === '=') {
          hash = hash[1]
        } else {
          throw new QueryError('DynamoDB only supports using equal operator for the HASH key')
        }
      }

      if (this.metadata.range != null) {
        range = get(filters, this.metadata.range.propertyName)

        if (isArray(hash)) {
          if (hash[0] === '=') {
            hash = hash[1]
          } else {
            throw new QueryError('DynamoDB only supports using equal operator for the RANGE key on GetItem operations')
          }
        }
      }
    }

    if (this.metadata.range != null && range == null) {
      throw new QueryError('Cannot use primaryKey.get without a range key value')
    }

    const keyMap: AttributeMap = {
      [this.metadata.hash.name]: this.metadata.hash.toDynamoAssert(hash),
    }

    if (this.metadata.range != null) {
      keyMap[this.metadata.range.name] = this.metadata.range.toDynamoAssert(range)
    }

    return this.table.fromDynamo(keyMap, false)
  }

  /**
   * This will create a temporary Table instance, then calls record.fromJSON() passing your requested changes.
   * record.fromJSON() handles setting and deleting attributes.
   *
   * It then has the Table.Schema build the DynamoDB.UpdateItemInput with all the requested changes.
   */
  public async update(input: PrimaryKeyUpdateItem<T, HashKeyType, RangeKeyType>): Promise<void> {
    await this.fromKey(input.hash, input.range).fromJSON(input.changes).save(input.conditions)
  }
}
