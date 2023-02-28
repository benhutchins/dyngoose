import { AttributeValue } from '@aws-sdk/client-dynamodb'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { SchemaError } from '../../errors'
import { IAttributeType } from '../../interfaces'
import { DateAttributeMetadata } from '../../metadata/attribute-types/date.metadata'
import { Table } from '../../table'
import { AttributeType } from '../../tables/attribute-type'
import { stringToNumber } from './utils'

type Value = Date
type Metadata = DateAttributeMetadata

const DateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/
const ISOPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

export class DateAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.String

  constructor(record: Table, propertyName: string, metadata?: Metadata) {
    super(record, propertyName, metadata)

    if (this.metadata?.unixTimestamp === true || this.metadata?.millisecondTimestamp === true || this.metadata?.timeToLive === true) {
      this.type = DynamoAttributeType.Number
    }
  }

  decorate(): void {
    super.decorate()

    if (this.metadata?.timeToLive === true) {
      if (this.schema.timeToLiveAttribute != null) {
        throw new SchemaError(`Table ${this.schema.name} has two timeToLive attributes defined`)
      } else {
        this.schema.timeToLiveAttribute = this.attribute
      }
    }
  }

  getDefault(): Value | null {
    if (this.metadata?.nowOnCreate === true || this.metadata?.nowOnUpdate === true) {
      return new Date()
    }

    return null
  }

  toDynamo(dt: Value): AttributeValue {
    if (this.metadata?.nowOnUpdate === true) {
      dt = new Date()
    }

    if (this.metadata?.unixTimestamp === true || this.metadata?.millisecondTimestamp === true || this.metadata?.timeToLive === true) {
      return {
        N: this.parseDate(dt).toString(),
      }
    } else {
      return {
        S: this.parseDate(dt).toString(),
      }
    }
  }

  fromDynamo(attributeValue: AttributeValue): Value | null {
    // whenever the value is stored as a number, it must be a timestamp
    // the timestamp will have been stored in UTC
    if (attributeValue.N != null) {
      if (this.metadata?.millisecondTimestamp === true) {
        return new Date(stringToNumber(attributeValue.N))
      } else if (this.metadata?.unixTimestamp === true || this.metadata?.timeToLive === true) {
        return new Date(stringToNumber(attributeValue.N) * 1000)
      } else {
        return null
      }
    } else if (attributeValue.S != null) {
      return new Date(attributeValue.S)
    } else {
      return null
    }
  }

  fromJSON(dt: string | number): Value {
    if (this.metadata?.unixTimestamp === true || this.metadata?.timeToLive === true) {
      return new Date(stringToNumber(dt) * 1000)
    } else if (this.metadata?.millisecondTimestamp === true) {
      return new Date(stringToNumber(dt))
    } else {
      return new Date(dt as string)
    }
  }

  toJSON(dt: Value): string | number {
    if (!(dt instanceof Date)) {
      throw new Error('Attempting to pass a non-Date value to DateAttributeType.toJSON is not supported')
    }

    if (this.metadata?.unixTimestamp === true || this.metadata?.timeToLive === true) {
      // the Math.floor gets rid of the decimal places, which would corrupt the value when being saved
      return Math.floor(dt.valueOf() / 1000)
    } else if (this.metadata?.millisecondTimestamp === true) {
      return dt.valueOf()
    } else if (this.metadata?.dateOnly === true) {
      // grab the ISO string, then split at the time (T) separator and grab only the date
      return dt.toISOString().split('T')[0]
    } else {
      return dt.toISOString()
    }
  }

  parseDate(dt: Value | string | number): string | number {
    // support ISO formatted date strings
    if (typeof dt === 'string') {
      // if date only, support YYYY-MM-DD
      if (this.metadata?.dateOnly === true && DateOnlyPattern.test(dt)) {
        // parse YYYY-MM-DD and ensure we create the Date object in UTC
        const b = dt.split('-').map((d) => parseInt(d, 10))
        dt = new Date(Date.UTC(b[0], --b[1], b[2]))
      // if timestamp, assume the value is a timestamp
      } else if (this.metadata?.unixTimestamp === true || this.metadata?.timeToLive === true) {
        dt = new Date(stringToNumber(dt) * 1000)
      } else if (this.metadata?.millisecondTimestamp === true) {
        dt = new Date(stringToNumber(dt))
      } else if (ISOPattern.test(dt)) {
        dt = new Date(dt)
      }
    } else if (typeof dt === 'number') {
      if (this.metadata?.unixTimestamp === true || this.metadata?.timeToLive === true) {
        dt = new Date(dt * 1000)
      } else if (this.metadata?.millisecondTimestamp === true) {
        dt = new Date(dt)
      }
    }

    return this.toJSON(dt as Date)
  }
}
