import { DynamoDB } from 'aws-sdk'
import { Attribute } from '../attribute'
import { IThroughput } from '../interfaces'
import * as Metadata from '../metadata'
import * as Query from '../query'
import { ITable, Table } from '../table'
import { createTableInput } from './create-table-input'

export class Schema {
  public options: Metadata.Table

  /**
   * The TableName in DynamoDB
   */
  public get name(): string {
    return this.options.name || ''
  }

  // Default Index, which every table must have
  public primaryKey: Metadata.Index.PrimaryKey
  public timeToLiveAttribute: Attribute<Date>

  // Additional table indexes
  public globalSecondaryIndexes: Metadata.Index.GlobalSecondaryIndex[] = []
  public localSecondaryIndexes: Metadata.Index.LocalSecondaryIndex[] = []

  /**
   * The desired Throughput for this table in DynamoDB
   */
  public throughput: IThroughput

  /**
   * Holds the DynamoDB Client for the table
   */
  public dynamo: DynamoDB

  // List of attributes this table has
  private readonly attributes: Map<string, Attribute<any>> = new Map()

  constructor(private table: ITable<any>) {}

  public setMetadata(metadata: Metadata.Table = {}) {
    this.options = metadata

    this.setThroughput(this.options.throughput || {
      read: 5,
      write: 5,
      autoScaling: {
        targetUtilization: 70,
        minCapacity: 5,
        maxCapacity: 40000,
      },
    })
  }

  public defineAttributeProperties() {
    // for each attribute, add the get and set property handlers
    for (const attribute of this.attributes.values()) {
      Object.defineProperty(
        this.table.prototype,
        attribute.propertyName,
        {
          configurable: true,
          enumerable: true,
          get(this: Table) {
            return this.getAttribute(attribute.name)
          },
          set(this: Table, value: any) {
            this.setAttribute(attribute.name, value)
          },
        },
      )
    }
  }

  public defineGlobalSecondaryIndexes() {
    for (const indexMetadata of this.globalSecondaryIndexes) {
      Object.defineProperty(
        this.table,
        indexMetadata.propertyName,
        {
          value: new Query.GlobalSecondaryIndex(this.table, indexMetadata),
          writable: false,
        },
      )
    }
  }

  public defineLocalSecondaryIndexes() {
    for (const indexMetadata of this.localSecondaryIndexes) {
      Object.defineProperty(
        this.table,
        indexMetadata.propertyName,
        {
          value: new Query.LocalSecondaryIndex(this.table, indexMetadata),
          writable: false,
        },
      )
    }
  }

  public definePrimaryKeyProperty() {
    Object.defineProperty(
      this.table,
      this.primaryKey.propertyName,
      {
        value: new Query.PrimaryKey(this.table, this.primaryKey),
        writable: false,
      },
    )
  }

  public setThroughput(throughput: number | IThroughput) {
    if (typeof throughput === 'number') {
      this.throughput = {
        read: throughput,
        write: throughput,
      }
    } else {
      this.throughput = throughput

      if (this.throughput.autoScaling === true) {
        this.throughput.autoScaling = {
          targetUtilization: 70,
          minCapacity: 5,
          maxCapacity: 40000,
        }
      }
    }

    if (!this.throughput.read || !this.throughput.write) {
      throw new Error(`Schema for ${this.name} has invalid throughput ${JSON.stringify(this.throughput)}`)
    }
  }

  public getAttributes() {
    return this.attributes.entries()
  }

  public getAttributeByName(attributeName: string, allowAutoCreate = true): Attribute<any> {
    let childSegment: string | void
    if (attributeName.includes('.')) {
      [attributeName, childSegment] = attributeName.split('.')
    }
    const attribute = this.attributes.get(attributeName)
    if (attribute) {
      if (childSegment) {
        return (attribute.type as any).attributes[childSegment]
      }
      return attribute
    } else {
      throw new Error(`Schema for ${this.name} has no attribute named ${attributeName}`)
    }
  }

  public addAttribute(attribute: Attribute<any>): Attribute<any> {
    if (this.attributes.has(attribute.name)) {
      throw new Error(`Table ${this.name} has several attributes named ${attribute.name}`)
    }

    this.attributes.set(attribute.name, attribute)
    return attribute
  }

  public setPrimaryKey(hashKey: string, rangeKey: string | void, propertyName: string) {
    const hash = this.getAttributeByName(hashKey, false)
    if (!hash) {
      throw new Error(`Specified hashKey ${hashKey} attribute for the PrimaryKey for table ${this.name} does not exist`)
    }

    let range: Attribute<any> | undefined

    if (rangeKey) {
      range = this.getAttributeByName(rangeKey, false)

      if (!range) {
        throw new Error(`Specified rangeKey ${rangeKey} attribute for the PrimaryKey for table ${this.name} does not exist`)
      }
    }

    this.primaryKey = {
      propertyName,
      hash,
      range,
    }
  }

  public createTableInput(forCloudFormation = false) {
    return createTableInput(this, forCloudFormation)
  }

  public createCloudFormationResource() {
    return this.createTableInput(true)
  }

  public toDynamo(record: Table | Map<string, any>): DynamoDB.AttributeMap {
    const attributeMap: DynamoDB.AttributeMap = {}

    for (const [attributeName, attribute] of this.attributes.entries()) {
      const attributeValue = attribute.toDynamo(record.get(attributeName))

      if (attributeValue) {
        attributeMap[attributeName] = attributeValue
      }
    }

    return attributeMap
  }
}
