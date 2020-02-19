import { DynamoDB } from 'aws-sdk'
import * as moment from 'moment'
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
        N: this.toJSON(dt),
      }
    } else {
      return {
        S: this.toJSON(dt),
      }
    }
  }

  fromDynamo(attributeValue: DynamoDB.AttributeValue) {
    // whenever the value is stored as a number, it must be a timestamp
    // the timestamp will have been stored in UTC
    if (attributeValue.N) {
      if (this.metadata.millisecondTimestamp) {
        return new Date(stringToNumber(attributeValue.N))
      } else {
        // the timestamp will be converted from UTC (as all timestamps as in UTC), to the local time
        // so we need to convert it back to UTC to ensure all dates read from the database as in UTC
        return moment.unix(stringToNumber(attributeValue.N)).utc().toDate()
      }
    } else if (attributeValue.S) {
      if (this.metadata.dateOnly) {
        return moment.utc(attributeValue.S as string, 'YYYY-MM-DD', true).toDate()
      } else {
        return moment.utc(attributeValue.S as string, this.metadata.format || moment.ISO_8601, true).toDate()
      }
    }
  }

  fromJSON(dt: moment.MomentInput) {
    // TODO: this might not be the best way to parse dates, and it doesn't currently handle invalid dates well
    return moment.utc(dt).toDate()
  }

  toJSON(dt: Value): string {
    const m = moment.utc(dt)
    if (this.metadata.unixTimestamp || this.metadata.timeToLive) {
      return m.unix().toString()
    } else if (this.metadata.millisecondTimestamp) {
      return m.valueOf().toString()
    } else if (this.metadata.dateOnly) {
      return m.format('YYYY-MM-DD')
    } else if (this.metadata.format) {
      return m.format(this.metadata.format as string)
    } else {
      return moment.utc(dt).toISOString()
    }
  }
}
