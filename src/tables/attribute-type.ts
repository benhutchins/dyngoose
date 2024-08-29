import type { AttributeValue } from '@aws-sdk/client-dynamodb'

import { Attribute } from '../attribute'
import type { DynamoAttributeTypes } from '../dynamo-attribute-types'
import type { IAttributeType } from '../interfaces'
import type { AttributeMetadata } from '../metadata/attribute'
import type { ITable, Table } from '../table'
import type { Schema } from './schema'

export class AttributeType<Value, Metadata extends AttributeMetadata<Value>> implements IAttributeType<Value> {
  public type!: DynamoAttributeTypes

  private __attribute?: Attribute<any>

  constructor(
    protected record: Table,
    protected propertyName: string,
    protected metadata?: Metadata,
  ) {}

  get attribute(): Attribute<Value> {
    if (this.__attribute == null) {
      this.__attribute = new Attribute<Value>(this.propertyName, this, this.metadata)
    }
    return this.__attribute
  }

  protected get table(): ITable<any> {
    return this.record.constructor as ITable<any>
  }

  protected get schema(): Schema {
    return this.table.schema
  }

  decorate(): void {
    this.schema.addAttribute(this.attribute)
  }

  toDynamo(value: Value, attribute: Attribute<Value>): AttributeValue {
    return { [this.type]: value } as any // TODO: should not have to use an as any here
  }

  fromDynamo(attributeValue: AttributeValue, attribute: Attribute<Value>): Value | null {
    return (attributeValue as any)[this.type]
  }
}
