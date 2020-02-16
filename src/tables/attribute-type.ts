import { DynamoDB } from 'aws-sdk'
import { Attribute } from '../attribute'
import { DynamoAttributeTypes } from '../dynamo-attribute-types'
import { IAttributeType } from '../interfaces/attribute-type.interface'
import { AttributeMetadata } from '../metadata/attribute'
import { ITable, Table } from '../table'

export class AttributeType<Value, Metadata extends AttributeMetadata<Value>> implements IAttributeType<Value> {
  public type: DynamoAttributeTypes

  private __attribute: Attribute<any>

  constructor (
    protected record: Table,
    protected propertyName: string,
    protected metadata: Metadata,
  ) {}

  get attribute(): Attribute<Value> {
    if (!this.__attribute) {
      this.__attribute = new Attribute<Value>(this.propertyName, this, this.metadata || {})
    }
    return this.__attribute
  }

  protected get table() {
    return this.record.constructor as ITable<any>
  }

  protected get schema() {
    return this.table.schema
  }

  decorate(): void {
    this.schema.addAttribute(this.attribute)
  }

  toDynamo(value: Value, attribute: Attribute<Value>): DynamoDB.AttributeValue {
    return { [this.type]: value }
  }

  fromDynamo(attributeValue: DynamoDB.AttributeValue, attribute: Attribute<Value>): Value | undefined {
    return (attributeValue as any)[this.type]
  }
}
