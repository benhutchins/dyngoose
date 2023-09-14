Dyngoose supports several useful types of attributes right out of the box. Below you can see the complete list as a table. Below that you can read about the options available for each type of attribute.

Dyngoose provides a few attribute types that are not standard DynamoDB attribute types. The [Date](#dyngooseattributedate) and the [Any](#dyngooseattributeany) types are quite useful.

You can also [define custom types](#custom-attribute-types).

| Dyngoose Attribute | DynamoDB type | JavaScript type | Description |
|-|-|-|-|
| `@Dyngoose.Attribute` | `S` | `string` | Converts any JavaScript object into a DynamoDB attribute value. |
| [`@Dyngoose.Attribute.String`](#dyngooseattributestring) | `S` | `string` | Stores string values. |
| `@Dyngoose.Attribute.Number` | `N` | `number` or `BigInt` | Stores number values. |
| `@Dyngoose.Attribute.Boolean` | `BOOL` | `boolean` | Stores boolean values. |
| `@Dyngoose.Attribute.Binary` | `B` | `Buffer` | Stores binary values. |
| `@Dyngoose.Attribute.StringSet` | `SS` | `Set<string>` | Stores a set of string values. |
| `@Dyngoose.Attribute.NumberSet` | `NS` | `Set<number>` | Stores a set of number values. |
| `@Dyngoose.Attribute.BinarySet` | `BS` | `Set<Buffer>` | Stores a set of binary values. |
| `@Dyngoose.Attribute.List` | `L` | `undefined` | Not implemented. |
| `@Dyngoose.Attribute.Map` | `M` | `Object` | Stores an object as a DynamoDB Map, allowing for querying and filtering of values within the map. |
| [`@Dyngoose.Attribute.Any`](dyngooseattributeany) | `S` | `Object` | Stores an object as a JSON-encoded string in DynamoDB, does not allow querying or filtering of child attributes. |
| [`@Dyngoose.Attribute.Date`](dyngooseattributedate) | `S` or `N` | `Date` | Stores a Date value. By default stores values in a ISO 8601 formatted string. You can use options to store values as Unix timestamps. |

#### Alternative Decorator Style

Dyngoose also allows all the official attribute types to be defined simply as `Dyngoose.Attribute('String')` if you prefer. You can pass your options as a second argument.

The standard format is recommended for constituency, as providing an interface to the `Map` type or using custom types will be very different styles.

#### Set Attributes

There are several types of Set attributes, `StringSet`, `NumberSet`, and `BinarySet`. These allow you to store arrays in an optimized format within DynamoDB, allowing you to utilize `includes`, `excludes`, `contains`, `not contains`, [query conditions](Querying.md#query-conditions).

### Dyngoose Attribute Types

#### Dyngoose.Attribute or Dyngoose.Attribute.Dynamic

> [dynamic.metadata.ts](https://github.com/benhutchins/dyngoose/blob/master/src/metadata/attribute-types/dynamic.metadata.ts)

The `Dynamic` attribute relies on AWS's official [AWS.DynamoDB.Converter](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/Converter.html)
utility. The additional options available from the converter are exposed on the attribute:

```typescript
@Dyngoose.Attribute.Dynamic({
  marshallOptions: {},
  unmarshallOptions: {},
})
```

##### Limitations of Dynamic Attributes

Dynamic attributes have many limitations. When possible, it is recommended you use to explicit attribute types but it is useful to have the flexibility.

1. Arrays are always converted to a `List` (`L`) in DynamoDB.

   When your array contains only strings or numbers, a `Set` is often better as it offers additional query and update operators.

2. Cannot use a Dynamic attribute with an attribute in the table's Primary Key or an Index.

   To build indexes properly, the attribute type must be set and the attribute
   value must be that defined type consistently. Dyngoose defaults the type for
   Dynamic attributes to a `String` (`S`) in DynamoDB but this is often
   incorrect and it'll be better to use a specific attribute type class.

#### Dyngoose.Attribute.String

> [string.metadata.ts](https://github.com/benhutchins/dyngoose/blob/master/src/metadata/attribute-types/string.metadata.ts)

The `String` attribute supports additional settings:

```typescript
@Dyngoose.Attribute.String({
  // trims the value before saving
  trim: true,

  // forces the value to lowercase
  lowercase: true,

  // forces the value to uppercase
  uppercase: true,
})
```

These options are also available on the `Dyngoose.Attribute.StringSet` type.

#### Dyngoose.Attribute.Any

The `Any` attribute is very useful. It stores any JavaScript as a stringified JSON value, encoded using the Node.js built-in `JSON.stringify` method. Using `Any` is very different from a [`Map`](#dyngooseattributemap), because [`Map`](#dyngooseattributemap) attributes are strict about the child attributes you define. `Any` allows you to easily store arbitrary values, which can be very useful for things like metadata, options, preferences, event or log data; to name a few examples.

```typescript
  @Dyngoose.Attribute.Any()
  public options: IOptions
```

It's very useful to define your property as an interface, this will help ensure you stick to standard value formats. You don't have to though, you can use the `any` property.

Since `Any` values are JSON-encoded strings, you generally cannot perform any useful querying or filtering on these attributes. If you want to query, use a [`Map`](#dyngooseattributemap) instead.

#### Dyngoose.Attribute.Date

By default, the `Date` attributes stores values in an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format, with all times forced into the UTC timezone to allow for proper filtering by dates.

The `Date` attribute supports additional settings:

```typescript
@Dyngoose.Attribute.Date({
  // store value as a Unix timestamp number value
  unixTmestamp: true,

  // store value as a Millisecond Timestamp number value
  millisecondTimestamp: true,

  // store only the date, not the time, in a YYYY-MM-DD format
  dateOnly: true,

  // sets the expiration time for this record, see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
  timeToLive: true,

  // defaults to current time when a new record is created
  nowOnCreate: true,

  // defaults to current time when a record is created or updated
  nowOnUpdate: true,
})
```

#### Dyngoose.Attribute.List

The `List` attribute supports relies on AWS' marshall utility, to convert any
JavaScript object into a DynamoDB attribute.

```typescript
@Dyngoose.Attribute.List({
  marshallOptions: {},
  unmarshallOptions: {},
})
list: any[]
```

### Custom Attribute Types

You can easily define your own attribute type and implement your own handler for transposing the value to and from DynamoDB.

Here is an example:

```typescript
type Value = string
type Metadata = Dyngoose.Metadata.Attribute<string>

export class UUIDAttributeType extends Dyngoose.AttributeType<Value, Metadata> {
  type = Dyngoose.DynamoAttributeType.String // could also use 'S'

  getDefault() {
    return uuid()
  }
}
```

That's a pretty simple example, here's a more complex one:

```typescript
type Value = string
type Metadata = Dyngoose.Metadata.Attribute<string>

export class CustomAttributeType extends Dyngoose.AttributeType<Value, Metadata> {
  type = Dyngoose.DynamoAttributeType.String

  toDynamo(value: Value): DynamoDB.AttributeValue {
    return {
      S: JSON.stringify(value),
    }
  }

  fromDynamo(value: DynamoDB.AttributeValue): Value | null {
    return JSON.parse(value.S as string)
  }
}
```
