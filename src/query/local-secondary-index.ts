import { DynamoDB } from 'aws-sdk'
import * as Metadata from '../metadata'
import { ITable, Table } from '../table'
import { buildQueryExpression } from './expression'
import { Filters as QueryFilters } from './filters'
import { ConditionValueType } from './query'
import { Results as QueryResults } from './results'

type PrimaryKeyType = ConditionValueType

interface LocalSecondaryIndexQueryInput {
  rangeOrder?: 'ASC' | 'DESC'
  limit?: number
  exclusiveStartKey?: DynamoDB.Key
  consistent?: DynamoDB.ConsistentRead
}

interface LocalSecondaryIndexScanInput {
  limit?: number
  select?: DynamoDB.Select
  totalSegments?: DynamoDB.ScanTotalSegments
  segment?: DynamoDB.ScanSegment
  exclusiveStartKey?: DynamoDB.Key
  projectionExpression?: DynamoDB.ProjectionExpression
  consistent?: DynamoDB.ConsistentRead
}

export class LocalSecondaryIndex<T extends Table, HashKeyType extends PrimaryKeyType, RangeKeyType extends PrimaryKeyType> {
  constructor(
    readonly tableClass: ITable<T>,
    readonly metadata: Metadata.Index.LocalSecondaryIndex,
  ) {}

  public getQueryInput(input: LocalSecondaryIndexQueryInput = {}): DynamoDB.QueryInput {
    if (!input.rangeOrder) {
      input.rangeOrder = 'ASC'
    }
    const ScanIndexForward = input.rangeOrder === 'ASC'
    const queryInput: DynamoDB.QueryInput = {
      TableName: this.tableClass.schema.name,
      Limit: input.limit,
      IndexName: this.metadata.name,
      ScanIndexForward,
      ExclusiveStartKey: input.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      ConsistentRead: input.consistent,
    }

    return queryInput
  }

  public async query(filters: QueryFilters, input: LocalSecondaryIndexQueryInput = {}): Promise<QueryResults<T>> {
    if (!filters[this.tableClass.schema.primaryKey.hash.propertyName]) {
      throw new Error('Cannot perform a query on a GlobalSecondaryIndex without specifying a hash key value')
    }

    const queryInput = this.getQueryInput(input)
    const expression = buildQueryExpression(this.tableClass.schema, filters, this.metadata)
    queryInput.FilterExpression = expression.FilterExpression
    queryInput.KeyConditionExpression = expression.KeyConditionExpression
    queryInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
    queryInput.ExpressionAttributeValues = expression.ExpressionAttributeValues
    const output = await this.tableClass.schema.dynamo.query(queryInput).promise()
    return this.getQueryResults(output)
  }

  public getScanInput(input: LocalSecondaryIndexScanInput = {}): DynamoDB.ScanInput {
    const scanInput: DynamoDB.ScanInput = {
      TableName: this.tableClass.schema.name,
      Limit: input.limit,
      ExclusiveStartKey: input.exclusiveStartKey,
      ReturnConsumedCapacity: 'TOTAL',
      TotalSegments: input.totalSegments,
      Segment: input.segment,
    }

    return scanInput
  }

  public async scan(filters: QueryFilters | void | null, input: LocalSecondaryIndexScanInput = {}) {
    const scanInput = this.getScanInput(input)
    if (filters && Object.keys(filters).length > 0) {
      // don't pass the index metadata, avoids KeyConditionExpression
      const expression = buildQueryExpression(this.tableClass.schema, filters)
      scanInput.FilterExpression = expression.FilterExpression
      scanInput.ExpressionAttributeNames = expression.ExpressionAttributeNames
      scanInput.ExpressionAttributeValues = expression.ExpressionAttributeValues
    }
    const output = await this.tableClass.schema.dynamo.scan(scanInput).promise()
    return this.getQueryResults(output)
  }

  protected getQueryResults(output: DynamoDB.ScanOutput | DynamoDB.QueryOutput): QueryResults<T> {
    const records: T[] = (output.Items || []).map((item) => {
      return this.tableClass.fromDynamo(item)
    })

    return {
      records,
      count: output.Count || records.length,
      scannedCount: output.ScannedCount as number,
      lastEvaluatedKey: output.LastEvaluatedKey,
      consumedCapacity: output.ConsumedCapacity as DynamoDB.ConsumedCapacity,
    }
  }
}
