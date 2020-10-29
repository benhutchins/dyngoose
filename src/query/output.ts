import { DynamoDB } from 'aws-sdk'
import { Table } from '..'
import { ITable } from '../table'

export class QueryOutput<T extends Table> {
  public static fromDynamoOutput<T extends Table>(
    tableClass: ITable<T>,
    output: DynamoDB.ScanOutput | DynamoDB.QueryOutput,
  ): QueryOutput<T> {
    const queryOutput = new QueryOutput(tableClass)
    const items: T[] = []

    if (output.Items != null) {
      for (const item of output.Items) {
        items.push(tableClass.fromDynamo(item))
      }
    }

    queryOutput.items = items
    queryOutput.count = output.Count == null ? items.length : output.Count
    queryOutput.scannedCount = output.ScannedCount as number
    queryOutput.lastEvaluatedKey = output.LastEvaluatedKey
    queryOutput.consumedCapacity = output.ConsumedCapacity as DynamoDB.ConsumedCapacity

    return queryOutput
  }

  public static fromSeveralOutputs<T extends Table>(
    tableClass: ITable<T>,
    outputs: Array<QueryOutput<T>>,
  ): QueryOutput<T> {
    const queryOutput = new QueryOutput(tableClass)
    let count = 0
    let capacityUnits = 0
    let writeCapacityUnits = 0
    let readCapacityUnits = 0
    queryOutput.items = []

    // if this is the first page, or if we have not hit the last page, continue loading records…
    for (const output of outputs) {
      // append the query results
      queryOutput.items = queryOutput.items.concat(output.items)
      count += output.count

      if (queryOutput.scannedCount == null) {
        queryOutput.scannedCount = output.count
      } else {
        queryOutput.scannedCount += output.count
      }

      if (output.consumedCapacity != null) {
        if (output.consumedCapacity.CapacityUnits != null) {
          capacityUnits += output.consumedCapacity.CapacityUnits
        }

        if (output.consumedCapacity.WriteCapacityUnits != null) {
          writeCapacityUnits += output.consumedCapacity.WriteCapacityUnits
        }

        if (output.consumedCapacity.ReadCapacityUnits != null) {
          readCapacityUnits += output.consumedCapacity.ReadCapacityUnits
        }
      }
    }

    queryOutput.count = count
    queryOutput.consumedCapacity = {
      CapacityUnits: capacityUnits,
      WriteCapacityUnits: writeCapacityUnits,
      ReadCapacityUnits: readCapacityUnits,
    }

    return queryOutput
  }

  items: T[]
  count: number
  scannedCount: number
  lastEvaluatedKey?: DynamoDB.Key
  consumedCapacity: DynamoDB.ConsumedCapacity

  /**
   * The items returned from DynamoDB
   *
   * @deprecated, use .items
   */
  get records(): T[] {
    return this.items
  }

  protected constructor(
    protected readonly tableClass: ITable<T>,
  ) { }
}
