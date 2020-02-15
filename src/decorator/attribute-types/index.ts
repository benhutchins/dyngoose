import { Metadata, Table } from '../..'
import { AnyAttributeType } from './any'
import { BinaryAttributeType } from './binary'
import { BinarySetAttributeType } from './binary-set'
import { BooleanAttributeType } from './boolean'
import { DateOnlyAttributeType } from './date-only'
import { DateTimeAttributeType } from './date-time'
import { IMapValue, MapAttributeType } from './map'
import { NumberAttributeType } from './number'
import { NumberSetAttributeType } from './number-set'
import { StringAttributeType } from './string'
import { StringSetAttributeType } from './string-set'
import { TimestampAttributeType } from './timestamp'
// import { Attribute } from '../../attribute'

interface AttributeTypeMap {
  Any: AnyAttributeType
  Binary: BinaryAttributeType
  BinarySet: BinarySetAttributeType
  Boolean: BooleanAttributeType
  DateOnly: DateOnlyAttributeType
  DateTime: DateTimeAttributeType
  Number: NumberAttributeType
  NumberSet: NumberSetAttributeType
  String: StringAttributeType
  StringSet: StringSetAttributeType
  Timestamp: TimestampAttributeType
}

interface AttributeOptionsMap {
  Any: Metadata.AttributeType.Any
  Binary: Metadata.AttributeType.Binary
  BinarySet: Metadata.AttributeType.BinarySet
  Boolean: Metadata.AttributeType.Boolean
  DateOnly: Metadata.AttributeType.DateOnly
  DateTime: Metadata.AttributeType.DateTime
  Number: Metadata.AttributeType.Number
  NumberSet: Metadata.AttributeType.NumberSet
  String: Metadata.AttributeType.String
  StringSet: Metadata.AttributeType.StringSet
  Timestamp: Metadata.AttributeType.Timestamp
}

const AttributeTypes = {
  Any: AnyAttributeType,
  Binary: BinaryAttributeType,
  BinarySet: BinarySetAttributeType,
  Boolean: BooleanAttributeType,
  DateOnly: DateOnlyAttributeType,
  DateTime: DateTimeAttributeType,
  Number: NumberAttributeType,
  NumberSet: NumberSetAttributeType,
  String: StringAttributeType,
  StringSet: StringSetAttributeType,
  Timestamp: TimestampAttributeType,
}

export interface AttributeDefinition {
  (record: Table, propertyName: string): void
  getAttribute: (record: Table, propertyName: string) => any
}

export function Attribute<T extends keyof AttributeTypeMap>(type: T, options?: AttributeOptionsMap[T]): AttributeDefinition {
  const define = function (record: Table, propertyName: string) {
    const attributeType = AttributeTypes[type]
    const decorator = new attributeType(record, propertyName, options as any)
    decorator.decorate()
  }

  define.getAttribute = function (record: Table, propertyName: string) {
    const attributeType = AttributeTypes[type]
    const decorator = new attributeType(record, propertyName, options as any)
    return decorator.attribute()
  }

  return define
}

/**
 * Stores JSON objects as strings in DynamoDB.
 *
 * Can be used to store any values. Values will be parsed back into objects.
 */
Attribute.Any = (options?: Metadata.AttributeType.Any) => Attribute('Any', options)

Attribute.Binary = (options?: Metadata.AttributeType.Binary) => Attribute('Binary', options)
Attribute.BinarySet = (options?: Metadata.AttributeType.BinarySet) => Attribute('BinarySet', options)

Attribute.Boolean = (options?: Metadata.AttributeType.Boolean) => Attribute('Boolean', options)

/**
 * Stores a DateTime value in an ISO 8601 compliant format.
 *
 * Retrieved values will always be a Date object. Alternatives:
 *
 * * Moment attribute to retrieve values as Moment objects.
 * * Timestamp attribute to store values as unix timestamps.
 * * Date attribute to store dates (YYYY-MM-DD) only.
 */
Attribute.DateTime = (options?: Metadata.AttributeType.DateTime) => Attribute('DateTime', options)

/**
 * Stores a Date value in an ISO 8601 compliant format of YYYY-MM-DD.
 *
 * Completely ignores the Time aspect of a Date object, for that,
 * use DateTime or Timestamp.
 *
 * This will always store and return the value as a string.
 */
Attribute.DateOnly = (options?: Metadata.AttributeType.DateOnly) => Attribute('DateOnly', options)

Attribute.Number = (options?: Metadata.AttributeType.Number) => Attribute('Number', options)

/**
 * NumberSet
 * Value is an array of numbers.
 */
Attribute.NumberSet = (options?: Metadata.AttributeType.NumberSet) => Attribute('NumberSet', options)

Attribute.String = (options?: Metadata.AttributeType.String) => Attribute('String', options)
Attribute.StringSet = (options?: Metadata.AttributeType.StringSet) => Attribute('StringSet', options)

/**
 * Stores Unix timestamp values. Accepts inputted values as Numbers, Dates,
 * or Moment objects and covers them to standardized Unix timestamps.
 *
 * Alternatives:
 * * Moment attribute to retrieve values as Moment objects.
 * * Date attribute to store dates (YYYY-MM-DD) only.
 * * DateTIme attribute to store values as ISO 8601 strings.
 */
Attribute.Timestamp = (options?: Metadata.AttributeType.Timestamp) => Attribute('Timestamp', options)

Attribute.Map = <Value extends IMapValue>(options: Metadata.AttributeType.Map<Value>) => {
  return function (record: Table, propertyName: string) {
    const decorator = new MapAttributeType<Value>(record, propertyName, options as any)
    decorator.decorate()
  }
}
