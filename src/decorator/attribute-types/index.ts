import { Metadata, Table } from '../..'
import { AnyAttributeType } from './any'
import { BinaryAttributeType } from './binary'
import { BinarySetAttributeType } from './binary-set'
import { BooleanAttributeType } from './boolean'
import { DateAttributeType } from './date'
import { MapAttributeType } from './map'
import { NumberAttributeType } from './number'
import { NumberSetAttributeType } from './number-set'
import { StringAttributeType } from './string'
import { StringSetAttributeType } from './string-set'

interface AttributeTypeMap {
  Any: AnyAttributeType
  Binary: BinaryAttributeType
  BinarySet: BinarySetAttributeType
  Boolean: BooleanAttributeType
  Date: DateAttributeType
  Number: NumberAttributeType
  NumberSet: NumberSetAttributeType
  String: StringAttributeType
  StringSet: StringSetAttributeType
}

interface AttributeMetadataMap {
  Any: Metadata.AttributeType.Any
  Binary: Metadata.AttributeType.Binary
  BinarySet: Metadata.AttributeType.BinarySet
  Boolean: Metadata.AttributeType.Boolean
  Date: Metadata.AttributeType.Date
  Number: Metadata.AttributeType.Number
  NumberSet: Metadata.AttributeType.NumberSet
  String: Metadata.AttributeType.String
  StringSet: Metadata.AttributeType.StringSet
}

const AttributeTypes = {
  Any: AnyAttributeType,
  Binary: BinaryAttributeType,
  BinarySet: BinarySetAttributeType,
  Boolean: BooleanAttributeType,
  Date: DateAttributeType,
  Number: NumberAttributeType,
  NumberSet: NumberSetAttributeType,
  String: StringAttributeType,
  StringSet: StringSetAttributeType,
}

export interface AttributeDefinition {
  (record: Table, propertyName: string): void
  getAttribute: (record: Table, propertyName: string) => any
}

export function Attribute<T extends keyof AttributeTypeMap>(type: T, metadata?: AttributeMetadataMap[T]): AttributeDefinition {
  const define = function (record: Table, propertyName: string): void {
    const AttributeTypeClass: any = AttributeTypes[type]
    const decorator = new AttributeTypeClass(record, propertyName, metadata)
    decorator.decorate()
  }

  define.getAttribute = function (record: Table, propertyName: string): any {
    const AttributeTypeClass: any = AttributeTypes[type]
    const decorator = new AttributeTypeClass(record, propertyName, metadata)
    return decorator.attribute
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
 * Stores a Date value.
 *
 * By default, dates are stored in an ISO 8601 compliant string format in UTC timezone.
 *
 * Use metadata options to store values as timestamps or dates without the time.
 */
Attribute.Date = (options?: Metadata.AttributeType.Date) => Attribute('Date', options)

/**
 * For all your numbers needs.
 */
Attribute.Number = (options?: Metadata.AttributeType.Number) => Attribute('Number', options)

/**
 * If you have a lot of numbers, a NumberSet is what you need.
 */
Attribute.NumberSet = (options?: Metadata.AttributeType.NumberSet) => Attribute('NumberSet', options)

Attribute.String = (options?: Metadata.AttributeType.String) => Attribute('String', options)
Attribute.StringSet = (options?: Metadata.AttributeType.StringSet) => Attribute('StringSet', options)

Attribute.Map = <Value>(options: Metadata.AttributeType.Map<Value>) => {
  return function (record: Table, propertyName: string) {
    const decorator = new MapAttributeType<Value>(record, propertyName, options as any)
    decorator.decorate()
  }
}
