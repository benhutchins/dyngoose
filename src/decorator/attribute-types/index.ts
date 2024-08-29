import type { Metadata, Table } from '../..'
import type { MapBaseValue } from '../../metadata/attribute-types/map.metadata'
import { AnyAttributeType } from './any'
import { BinaryAttributeType } from './binary'
import { BinarySetAttributeType } from './binary-set'
import { BooleanAttributeType } from './boolean'
import { DateAttributeType } from './date'
import { DynamicAttributeType } from './dynamic'
import { ListAttributeType } from './list'
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
  Dynamic: DynamicAttributeType
  List: ListAttributeType
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
  Dynamic: Metadata.AttributeType.Dynamic
  List: Metadata.AttributeType.List
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
  Dynamic: DynamicAttributeType,
  List: ListAttributeType,
  Number: NumberAttributeType,
  NumberSet: NumberSetAttributeType,
  String: StringAttributeType,
  StringSet: StringSetAttributeType,
}

export interface AttributeDefinition {
  (record: Table, propertyName: string): void
  getAttribute: (record: Table, propertyName: string) => any
}

export function Attribute<T extends keyof AttributeTypeMap>(typeOrMetadata?: T | Metadata.AttributeType.Dynamic, metadata?: AttributeMetadataMap[T]): AttributeDefinition {
  const type = typeof typeOrMetadata === 'string' ? typeOrMetadata : 'Dynamic'
  metadata = metadata ?? (typeof typeOrMetadata === 'string' ? undefined : typeOrMetadata)

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

/**
 * Converts any JavaScript object into a DynamoDB attribute value.
 *
 * Uses AWS.DynamoDB.Converter (marshall and unmarshall).
 */
Attribute.Dynamic = (options?: Metadata.AttributeType.Any) => Attribute('Dynamic', options)

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

Attribute.List = (options?: Metadata.AttributeType.List) => Attribute('List', options)

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

Attribute.Map = <Value extends MapBaseValue>(options: Metadata.AttributeType.Map<Value>): AttributeDefinition => {
  const define = function (record: Table, propertyName: string): void {
    const decorator = new MapAttributeType<Value>(record, propertyName, options as any)
    decorator.decorate()
  }

  define.getAttribute = function (record: Table, propertyName: string): any {
    const decorator = new MapAttributeType(record, propertyName, options)
    return decorator.attribute
  }

  return define
}
