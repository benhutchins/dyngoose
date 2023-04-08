import { type QueryCommandInput, type QueryCommandOutput, type ScanCommandInput, type ScanCommandOutput, type Select } from '@aws-sdk/client-dynamodb'
import { has } from 'lodash'
import { HelpfulError, QueryError } from '../errors'
import { type Key } from '../interfaces/key.interface'
import type * as Metadata from '../metadata'
import { type ITable, type Table } from '../table'
import { buildQueryExpression } from './expression'
import { type Filters as QueryFilters } from './filters'
import { QueryOutput } from './output'
import { MagicSearch, type MagicSearchInput } from './search'

interface LocalSecondaryIndexQueryInput {
  rangeOrder?: 'ASC' | 'DESC'
  limit?: number
  exclusiveStartKey?: Key
  consistent?: boolean
}

interface LocalSecondaryIndexScanInput {
  limit?: number
  select?: Select
  totalSegments?: number
  segment?: number
  exclusiveStartKey?: Key
  projectionExpression?: string
  consistent?: boolean
}

export class LocalSecondaryIndex<T extends Table> {
  constructor(
    readonly tableClass: ITable<T>,
    readonly metadata: Metadata.Index.LocalSecondaryIndex,
  ) {}

  public getQueryInput(input: LocalSecondaryIndexQueryInput = {}): QueryCommandInput {
    if (input.rangeOrder == null) {
      input.rangeOrder = 'ASC'
    }
    const ScanIndexForward = input.rangeOrder === 'ASC'
    const queryInput: QueryCommandInput = {
      TableName: this.tableClass.schema.name,
      IndexName: this.metadata.name,
      Limit: input.limit,
      ScanIndexForward,
      ExclusiveStartKey: input.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      ConsistentRead: input.consistent,
    }

    return queryInput
  }

  public async query(filters: QueryFilters<T>, input: LocalSecondaryIndexQueryInput = {}): Promise<QueryOutput<T>> {
    if (!has(filters, this.tableClass.schema.primaryKey.hash.propertyName)) {
      throw new QueryError('Cannot perform a query on a LocalSecondaryIndex without specifying a hash key value')
    }

    const queryInput = this.getQueryInput(input)

    // convert the LocalSecondaryIndex metadata to a GlobalSecondaryIndex, which just adds the hash property
    const metadata: Metadata.Index.GlobalSecondaryIndex = Object.assign({
      hash: this.tableClass.schema.primaryKey.hash,
    }, this.metadata)

    const expression = buildQueryExpression(this.tableClass.schema, filters, metadata)
    queryInput.FilterExpression = expression.FilterExpression
    queryInput.KeyConditionExpression = expression.KeyConditionExpression
    queryInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
    queryInput.ExpressionAttributeValues = expression.ExpressionAttributeValues
    const hasProjection = queryInput.ProjectionExpression == null
    let output: QueryCommandOutput
    try {
      output = await this.tableClass.schema.dynamo.query(queryInput)
    } catch (ex) {
      throw new HelpfulError(ex, this.tableClass, queryInput)
    }
    return QueryOutput.fromDynamoOutput(this.tableClass, output, hasProjection)
  }

  public getScanInput(input: LocalSecondaryIndexScanInput = {}): ScanCommandInput {
    const scanInput: ScanCommandInput = {
      TableName: this.tableClass.schema.name,
      IndexName: this.metadata.name,
      Limit: input.limit,
      ExclusiveStartKey: input.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      TotalSegments: input.totalSegments,
      Segment: input.segment,
    }

    return scanInput
  }

  public async scan(filters: QueryFilters<T> | undefined | null, input: LocalSecondaryIndexScanInput = {}): Promise<QueryOutput<T>> {
    const scanInput = this.getScanInput(input)
    if (filters != null && Object.keys(filters).length > 0) {
      // don't pass the index metadata, avoids KeyConditionExpression
      const expression = buildQueryExpression(this.tableClass.schema, filters)
      scanInput.FilterExpression = expression.FilterExpression
      scanInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
      scanInput.ExpressionAttributeValues = expression.ExpressionAttributeValues
    }
    const hasProjection = scanInput.ProjectionExpression == null
    let output: ScanCommandOutput
    try {
      output = await this.tableClass.schema.dynamo.scan(scanInput)
    } catch (ex) {
      throw new HelpfulError(ex, this.tableClass, scanInput)
    }
    return QueryOutput.fromDynamoOutput(this.tableClass, output, hasProjection)
  }

  /**
   * Query DynamoDB for what you need.
   *
   * Starts a MagicSearch using this LocalSecondaryIndex.
   */
  public search(filters?: QueryFilters<T>, input: MagicSearchInput<T> = {}): MagicSearch<T> {
    return new MagicSearch<T>(this.tableClass as any, filters, input).using(this)
  }
}
