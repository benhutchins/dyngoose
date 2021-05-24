# Querying

Dyngoose has simple, yet powerful, querying support. Every query supports performing additional filters, but as DynamoDB is heavily optimized for getting items by indexes, the primary way you should perform operations is by using an index.

[Read more about advanced querying, searching, and filtering](MagicSearch.md).  
[Read more about managing indexes](Indexes.md).  

## Query methods

### `.search([filters, input])`

> https://github.com/benhutchins/dyngoose/blob/master/src/table.ts#L101

The first place to look at is the `.search` method available on every [Table](Table.md) and [Index](Indexes.md) class. This is the basic entry point to construct a search query.

`.search` returns a [`MagicSearch`](MagicSearch.md) instance.

The `.search` method is an all around "find me my data, now!" method. It will automatically use an index when available, but does not force the use of indexes and will fallback to a filtered [scan](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html) operation if necessary.

`.search` accepts a `filters: DynamoDB.Filters` argument, which is dynamically typed based on your table's properties. This means it will only allow you to pass in properties that are defined the table subclass and will enforce type consistency for all values.

Each individual filter can specify additional conditions. See [Filter Conditions](#filter-conditions) below to see all possible conditions.

```typescript
// a simple search
const users = await User.search({ email: 'john@example.com' }).exec()

// perform a search for any email containing @example.com
const users = await User.search({ email: ['contains', '@example.com'] }).exec()
```

`.search` returns a [`MagicSearch`](MagicSearch.md) which can be call-chained to build more complex queries:

```typescript
const invoices = await Invoice.search()
  .filter('user').eq(user.id)
  .and()
  .filter('status').eq('unpaid')
  .or()
  .filter('status').eq('partially-paid')
  .exec()
```

For more information on using the call-chaining, see the documentation on [MagicSearch.md](MagicSearch.md)

### `.primaryKey.get(hash, range)`

Get a record by it's primary key values. This returns the record instance directly or will return `void` if the record could not be found.

```typescript
// you can use filter by passing hash as an argument, and if there
// is a range key on the table that will be the second argument
const user = await User.primaryKey.query('hash value')

// or you can pass the hash (and range) as a strongly-typed object
const user = await User.primaryKey.query({
  id: '…'
})
```

You can also use `.get(hash, range)` which will use the `Dyngoose.Query.PrimaryKey` instance on the table.

#### `.get` on Indexes

`.get` cannot be used to perform a search or query of any kind if is used for retreiving a single document and assumes it will
find only one document. For your table's PrimaryKey, DynamoDB forces a unique pairing between the hash and range key so this
is ensured for you. For indexes, however, DynamoDB does not ensure that the indexes will be unique. For convenience, Dyngoose
offers a `.get` method on indexes and will apply a `Limit` of `1`. If you define your indexes in a way that you can ensure the
values will still be unique, `.get` can be helpful. In most circumstances it will be best to utilize `.query` and handle the
situation when multiple records are returned (for indexes).

### `.primaryKey.query(filters)`

Perform a filtered query on a table using the primary key. You must specify filters for your table's `HASH` and `RANGE`, but can additionally provide more filters to narrow the results.

```typescript
// query an index or a table's primary key
const users = await User.emailIndex.query({
  email: 'user@example.com',
})

// you can provide additional values if you'd like
const users = await User.emailIndex.query({
  email: 'user@example.com',
  fullName: ['contains', 'Smith'],
})
```

### `.primaryKey.scan([filters])`

Perform a [scan](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html) operation on the table. Can optionally specify filters to narrow the results, or leave blank to get all the records within the table.

### `.gsiIndex.query(filters)`

Perform a filtered query on a table using a GlobalSecondaryIndex. You must specify filters for your index's `HASH` and `RANGE`, but can additionally provide more filters to narrow the results.

### `.gsiIndex.scan([filters])`

Perform a [scan](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html) operation on the table using a GlobalSecondaryIndex. Can optionally specify filters to narrow the results, or leave blank to get all the records within the index.

### `.lsiIndex.query(filters)`

Perform a filtered query on a table using a LocalSecondaryIndex. You must specify filters for your table's `HASH` and the index's `RANGE`, but can additionally provide more filters to narrow the results.

### `.lsiIndex.scan([filters])`

Perform a [scan](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html) operation on the table using a LocalSecondaryIndex. Can optionally specify filters to narrow the results, or leave blank to get all the records within the index.

## Filter Conditions

The available conditions for `Dyngoose.Filters` are:

| Condition | Example | Purpose |
|-|-|-|
| `=` | `{ email: 'john@example.com' }` or `{ email: ['=', 'john@example.com'] }` | Attribute value must exactly match the specified value. |
| `<>` | `{ email: ['<>', 'john@example.com' }` | Attribute value must not match specified value. |
| `<` | `{ count: ['<', 100] }` | Attribute must be less than specified value. Works on `Number`, `String`, and `Date` attribute types. |
| `<=` | `{ count: ['<=', 99] }` | Attribute must be less than or equal to specified value. Works on `Number`, `String`, and `Date` attribute types. |
| `>` | `{ count: ['>', 100] }` | Attribute must be greater than specified value. Works on `Number`, `String`, and `Date` attribute types. |
| `>=` | `{ count: ['>=', 100] }` | Attribute must be greater than or equal to specified value. Works on `Number`, `String`, and `Date` attribute types. |
| `beginsWith` | `{ name: ['beginsWith', 'John'] }` | Attribute must start with specified value. |
| `between` | `{ dateOfBirth: ['between', Date.parse('1990-01-01'), Date.parse('1999-12-31')] }` | Looks for any record where the attribute value is between the given range. Works on `Number`, `String`, and `Date` attribute types. |
| `includes` | `{ numbers: ['includes', [1, 2, 3]] }` | Looks within a [Set Attribute](Attributes.md#set-attributes) for any of the specified values. Values must match exactly. |
| `excludes` | `{ skills: ['excludes', ['magic', 'sorcery']] }` | Looks within a [Set Attribute](Attributes.md#set-attributes) to verify no value matches the specified values. Values must match exactly. |
| `contains` | `{ email: ['contains', '@example.com'] }` | Looks at a value to see if it contains the given substring. This can be performed on a [Set Attribute](Attributes.md#set-attributes) to look for partial matches instead of exact matches. |
| `not contains` | `{ email: ['not contains', '@example.com'] }` | Similar to `contains`, except the exact opposite. Values must not contain the given substring. |
| `null` | `{ someProperty: ['null']` | Attribute value must exist and the value must be null. |
| `not null` | `{ someProperty: ['not null'] }` | Attribute value value must exist and have any value other than null. |
| `exists` | `{ someProperty: ['exists'] }` | Attribute must exist, value can be anything, including `NULL`. |
| `not exists` | `{ someProperty: ['not exists'] }` | Attribute must not exist on the record at all. |
