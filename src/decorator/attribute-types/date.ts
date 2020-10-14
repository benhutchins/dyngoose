import { DynamoDB } from 'aws-sdk'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { SchemaError } from '../../errors'
import { IAttributeType } from '../../interfaces/attribute-type.interface'
import { DateAttributeMetadata } from '../../metadata/attribute-types/date.metadata'
import { Table } from '../../table'
import { AttributeType } from '../../tables/attribute-type'
import { stringToNumber } from './utils'

type Value = Date
type Metadata = DateAttributeMetadata

export class DateAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.String

  constructor(record: Table, propertyName: string, metadata: Metadata) {
    super(record, propertyName, metadata)

    if (this.metadata.unixTimestamp || this.metadata.millisecondTimestamp || this.metadata.timeToLive) {
      this.type = DynamoAttributeType.Number
    }
  }

  decorate() {
    super.decorate()

    if (this.metadata.timeToLive) {
      if (this.schema.timeToLiveAttribute) {
        throw new SchemaError(`Table ${this.schema.name} has two timeToLive attributes defined`)
      } else {
        this.schema.timeToLiveAttribute = this.attribute
      }
    }
  }

  getDefault() {
    if (this.metadata.nowOnCreate || this.metadata.nowOnUpdate) {
      return new Date()
    }

    return null
  }

  toDynamo(dt: Value) {
    if (this.metadata.nowOnUpdate) {
      dt = new Date()
    }

    if (this.metadata.unixTimestamp || this.metadata.millisecondTimestamp || this.metadata.timeToLive) {
      return {
        N: this.toJSON(dt).toString(),
      }
    } else {
      return {
        S: this.toJSON(dt).toString(),
      }
    }
  }

  fromDynamo(attributeValue: DynamoDB.AttributeValue): Value | undefined {
    // whenever the value is stored as a number, it must be a timestamp
    // the timestamp will have been stored in UTC
    if (attributeValue.N) {
      if (this.metadata.millisecondTimestamp) {
        return new Date(stringToNumber(attributeValue.N))
      } else if (this.metadata.unixTimestamp || this.metadata.timeToLive) {
        return new Date(stringToNumber(attributeValue.N) * 1000)
      }
    } else if (attributeValue.S) {
      return new Date(attributeValue.S as string)
    }
  }

  fromJSON(dt: string | number): Value {
    if (this.metadata.unixTimestamp || this.metadata.timeToLive) {
      return new Date(stringToNumber(dt) * 1000)
    } else if (this.metadata.millisecondTimestamp) {
      return new Date(stringToNumber(dt))
    } else {
      return new Date(dt as string)
    }
  }

  toJSON(dt: Value): string | number {
    if (this.metadata.unixTimestamp || this.metadata.timeToLive) {
      // the Math.floor gets rid of the decimal places, which would corrupt the value when being saved
      return Math.floor(dt.valueOf() / 1000)
    } else if (this.metadata.millisecondTimestamp) {
      return dt.valueOf()
    } else if (this.metadata.dateOnly) {
      // grab the ISO string, then split at the time (T) separator and grab only the date
      return dt.toISOString().split('T')[0]
    } else {
      return dt.toISOString()
    }
  }
}
