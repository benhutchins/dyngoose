import { type ScanOutput, type QueryOutput as DynQueryOutput, type ConsumedCapacity } from '@aws-sdk/client-dynamodb'
import { type Table } from '..'
import { type Key } from '../interfaces/key.interface'
import { type ITable } from '../table'

export class QueryOutput<T extends Table> extends Array<T> {
  public static fromDynamoOutput<T extends Table>(
    tableClass: ITable<T>,
    output: ScanOutput | DynQueryOutput,
    hasProjection: boolean,
  ): QueryOutput<T> {
    const items: T[] = []

    if (output.Items != null) {
      for (const item of output.Items) {
        if (item != null) {
          const instance = tableClass.fromDynamo(item, !hasProjection)

          if (instance != null) {
            items.push(instance)
          }
        }
      }
    }

    const queryOutput = new QueryOutput(items, tableClass)
    queryOutput.count = output.Count == null ? items.length : output.Count
    queryOutput.scannedCount = output.ScannedCount as number
    queryOutput.lastEvaluatedKey = output.LastEvaluatedKey
    queryOutput.consumedCapacity = output.ConsumedCapacity as ConsumedCapacity

    return queryOutput
  }

  public static fromSeveralOutputs<T extends Table>(
    tableClass: ITable<T>,
    outputs: Array<QueryOutput<T>>,
  ): QueryOutput<T> {
    let count = 0
    let scannedCount = 0
    let capacityUnits = 0
    let writeCapacityUnits = 0
    let readCapacityUnits = 0
    let items: T[] = []

    // if this is the first page, or if we have not hit the last page, continue loading records…
    for (const output of outputs) {
      // append the query results
      items = items.concat(output)
      count += output.count

      if (output.scannedCount != null) {
        scannedCount += output.scannedCount
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

    const queryOutput = new QueryOutput(items, tableClass)
    queryOutput.count = count
    queryOutput.scannedCount = scannedCount
    queryOutput.consumedCapacity = {
      CapacityUnits: capacityUnits,
      WriteCapacityUnits: writeCapacityUnits,
      ReadCapacityUnits: readCapacityUnits,
    }

    // pass the lastEvaluatedKey from the last output, so paging could continue
    const last = outputs[outputs.length - 1]

    if (last != null) {
      queryOutput.lastEvaluatedKey = last.lastEvaluatedKey
    }

    return queryOutput
  }

  count: number
  scannedCount: number
  lastEvaluatedKey?: Key
  consumedCapacity: ConsumedCapacity

  /**
   * The items returned from DynamoDB
   *
   * @deprecated
   */
  get records(): T[] {
    return this
  }

  protected constructor(
    records: T[],
    protected readonly tableClass: ITable<T>,
  ) {
    super()

    for (let i = 0; i < records.length; i++) {
      const item = records[i]
      if (item != null) {
        this[i] = item
      }
    }
  }
}
