import { type CreateTableInput, type DynamoDB } from '@aws-sdk/client-dynamodb'
import { type Attribute } from '../attribute'
import { type MapAttributeType } from '../decorator/attribute-types/map'
import { SchemaError } from '../errors'
import { type AttributeMap, type IThroughput } from '../interfaces'
import type * as Metadata from '../metadata'
import * as Query from '../query'
import { type ITable, type Table } from '../table'
import { createTableInput } from './create-table-input'

export class Schema {
  public isDyngoose = true
  public options: Metadata.Table

  /**
   * The TableName in DynamoDB
   */
  public get name(): string {
    return this.options?.name == null ? '' : this.options.name
  }

  // Default Index, which every table must have
  public primaryKey: Metadata.Index.PrimaryKey
  public timeToLiveAttribute?: Attribute<Date>

  // Additional table indexes
  public globalSecondaryIndexes: Metadata.Index.GlobalSecondaryIndex[] = []
  public localSecondaryIndexes: Metadata.Index.LocalSecondaryIndex[] = []

  /**
   * The desired Throughput for this table in DynamoDB
   */
  public throughput?: IThroughput

  /**
   * Holds the DynamoDB Client for the table
   */
  public dynamo: DynamoDB

  // List of attributes this table has
  private readonly attributes = new Map<string, Attribute<any>>()

  constructor(private readonly table: ITable<any>) {}

  public setMetadata(metadata: Metadata.Table): void {
    this.options = Object.assign({
      // default options for a table
      billingMode: 'PAY_PER_REQUEST',
      backup: true,
    }, metadata)

    if (this.options.throughput != null) {
      this.setThroughput(this.options.throughput)
    }
  }

  public defineAttributeProperties(): void {
    // for each attribute, add the get and set property handlers
    for (const attribute of this.attributes.values()) {
      if (
        Object.prototype.hasOwnProperty.call(this.table, attribute.propertyName) === false ||
        // every function in JavaScript has a 'name' property, however, name is commonly
        // used as an attribute name so we basically want to ignore the default object property
        // … I know, a weird exception
        attribute.propertyName === 'name'
      ) {
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
  }

  public defineGlobalSecondaryIndexes(): void {
    for (const indexMetadata of this.globalSecondaryIndexes) {
      if (Object.prototype.hasOwnProperty.call(this.table, indexMetadata.propertyName) === false) {
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
  }

  public defineLocalSecondaryIndexes(): void {
    for (const indexMetadata of this.localSecondaryIndexes) {
      if (Object.prototype.hasOwnProperty.call(this.table, indexMetadata.propertyName) === false) {
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
  }

  public definePrimaryKeyProperty(): void {
    if (Object.prototype.hasOwnProperty.call(this.table, this.primaryKey.propertyName) === false) {
      Object.defineProperty(
        this.table,
        this.primaryKey.propertyName,
        {
          value: new Query.PrimaryKey(this.table, this.primaryKey),
          writable: false,
        },
      )
    }
  }

  public setThroughput(throughput: number | IThroughput): void {
    if (typeof throughput === 'number') {
      this.throughput = {
        read: throughput,
        write: throughput,
      }
    } else {
      this.throughput = throughput
    }

    if (this.throughput.read == null || this.throughput.write == null) {
      throw new SchemaError(`Schema for ${this.name} has invalid throughput ${JSON.stringify(this.throughput)}`)
    }
  }

  public getAttributes(): IterableIterator<[string, Attribute<any>]> {
    return this.attributes.entries()
  }

  public getAttributeByName(attributeName: string): Attribute<any> {
    let attribute: Attribute<any> | undefined

    if (attributeName.includes('.')) {
      const nameSegments = attributeName.split('.')
      const firstSegment = nameSegments.shift()

      if (firstSegment != null) {
        attribute = this.attributes.get(firstSegment)

        for (const nameSegment of nameSegments) {
          if (attribute != null) {
            attribute = (attribute.type as MapAttributeType<any>).attributes[nameSegment]
          }
        }
      }
    } else {
      attribute = this.attributes.get(attributeName)
    }

    if (attribute == null) {
      throw new SchemaError(`Schema for ${this.name} has no attribute named ${attributeName}`)
    } else {
      return attribute
    }
  }

  public getAttributeByPropertyName(propertyName: string): Attribute<any> {
    let attribute: Attribute<any> | undefined

    if (propertyName.includes('.')) {
      const nameSegments = propertyName.split('.')
      const firstSegment = nameSegments.shift()

      if (firstSegment != null) {
        for (const attr of this.attributes.values()) {
          if (attr.propertyName === firstSegment) {
            attribute = attr
          }
        }

        for (const nameSegment of nameSegments) {
          if (attribute != null) {
            const mapAttributes = (attribute.type as MapAttributeType<any>).attributes
            mapAttributesFor: for (const mapAttribute of Object.values(mapAttributes)) {
              if (mapAttribute.propertyName === nameSegment) {
                attribute = mapAttribute
                break mapAttributesFor
              }
            }
          }
        }
      }
    } else {
      for (const attr of this.attributes.values()) {
        if (attr.propertyName === propertyName) {
          attribute = attr
        }
      }
    }

    if (attribute == null) {
      throw new SchemaError(`Schema for ${this.name} has no attribute by property name ${propertyName}`)
    } else {
      return attribute
    }
  }

  public addAttribute(attribute: Attribute<any>): Attribute<any> {
    if (this.attributes.has(attribute.name)) {
      throw new SchemaError(`Table ${this.name} has several attributes named ${attribute.name}`)
    }

    this.attributes.set(attribute.name, attribute)
    return attribute
  }

  public setPrimaryKey(hashKey: string, rangeKey: string | undefined, propertyName: string): void {
    const hash = this.getAttributeByName(hashKey)
    if (hash == null) {
      throw new SchemaError(`Specified hashKey ${hashKey} attribute for the PrimaryKey for table ${this.name} does not exist`)
    }

    let range: Attribute<any> | undefined

    if (rangeKey != null) {
      range = this.getAttributeByName(rangeKey)

      if (range == null) {
        throw new SchemaError(`Specified rangeKey ${rangeKey} attribute for the PrimaryKey for table ${this.name} does not exist`)
      }
    }

    this.primaryKey = {
      propertyName,
      hash,
      range,
    }
  }

  public createTableInput(forCloudFormation = false): CreateTableInput {
    return createTableInput(this, forCloudFormation)
  }

  public createCloudFormationResource(): any {
    return this.createTableInput(true)
  }

  public toDynamo(record: Table | Map<string, any>): AttributeMap {
    const attributeMap: AttributeMap = {}

    for (const [attributeName, attribute] of this.attributes.entries()) {
      // there is a quirk with the typing of Table.get, where we exclude all the default Table properties and therefore
      // on the Table class itself, no property name is possible, so we pass 'as never' below to fix a linter warning
      // but this actually works as expected
      const attributeValue = attribute.toDynamo(record.get(attribute.propertyName as never))

      if (attributeValue != null) {
        attributeMap[attributeName] = attributeValue
      }
    }

    return attributeMap
  }
}
