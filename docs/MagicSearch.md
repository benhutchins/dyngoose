# MagicSearch

Dyngoose supports a call-chaining search and querying method, called `Dyngoose.MagicSearch`, that is available as `.search` on every [Table](Table.md) and [Index](Indexes.md) class. This function acts as a builder to construct your query with the appropriate settings before executing it (`query.exec()`).

`Dyngoose.MagicSearch` supports advanced filtering, but as DynamoDB is heavily optimized for getting items by indexes, the primary way you should perform operations is by using an index. In most cases, you can perform simpler querying, see [Querying](Querying.md).

[Read more about simple querying](Querying.md).  
[Read more about managing Indexes](Indexes.md).  

## Creating a MagicSearch instance

### `Table.search([filters])`

This is the basic entry point to construct a search query. 

By default, `MagicSearch` will detect the best index when possible. If you provide a filter on an attribute that is the `hashKey` of an index or the table in your query, it will utilize the index of perform a `query` operation on the table; whatever it thinks will perform best. When no `hashKey` is utilized, `MagicSearch` will perform a `scan` filtered operation automatically.

The `filters` argument is optional and be an object of filters similar to those used in other [queries](Querying.md). In the event you don't pass in any parameters and don't call any other methods on the query object it will query with no filters or options.

### `Index.search([filters])`

Similar to `Table.search`, calling `.search` on an index will return a `MagicSearch` instance, however, when calling on an index it will perform the query on the index.

Additionally, you can do this by calling `Table.search().using(Table.gsiIndex)`, see `.using` below.

## Examples

It is often easiest to learn by example, so here are some to get you started:

```typescript
// search the User table for a specific record
await User.search().filter('email').eq('test@example.com').exec()

// search the User table for active admin users
await User.search()
  .filter('status').eq('enabled')
  .and() // using .and() is optional but it can help with adding clarity to your code
  .filter('role').eq('admin')
  .exec()

// search the Invoice table for past orders that have not been paid
await Invoice.search()
  .filter('amountDue').gt(0)
  .and()
  .filter('dueDate').gt(moment().subtract(45, 'days').toDate())
  .exec()

// search on the InvoiceUserIndex for unpaid invoices for a specific user
await Invoice.userIndex.search()
  .filter('user').eq('user.id')
  .and()
  .filter('amountDue').gt(0)
  .exec()
```

## `Dyngoose.MagicSearch` methods

### `query.filter(attributePropertyName)`

Calling `query.filter()` returns a new instance of `Dyngoose.Condition`. This is necessary to create strictly-typed queries. Upon calling one of the condition methods below it will return the `Dyngoose.MagicSearch` instance to allow you to continue call-chaining.

Additionally `query.where()` and `query.attribute()` are aliases for `query.filter()`.

The available methods on `Dyngoose.Condition` are:

| Condition | Example | Purpose |
|-|-|-|
| `.eq(value)` | `.filter('email').eq('john@example.com')` | Attribute value must exactly match the specified value. |
| `.not().eq(value)` | `.filter('email').not().eq('john@example.com')` | Attribute value must not match specified value. |
| `.lt(value)` | `.filter('count').lt(100)` | Attribute must be less than specified value. Works on `Number`, `String`, and `Date` attribute types. |
| `.lte(value)` | `.filter('count').lte(99)` | Attribute must be less than or equal to specified value. Works on `Number`, `String`, and `Date` attribute types. |
| `.gt(value)` | `.filter('count').gt(100)` | Attribute must be greater than specified value. Works on `Number`, `String`, and `Date` attribute types. |
| `.gte(value)` | `.filter('count').gte(100)` | Attribute must be greater than or equal to specified value. Works on `Number`, `String`, and `Date` attribute types. |
| `.beginsWith(value)` | `.filter('name').beginsWith('John')` | Attribute must start with specified value. |
| `.between(start, end)` | `.filter('dateOfBirth').between(Date.parse('1990-01-01'), Date.parse('1999-12-31'))` | Looks for any record where the attribute value is between the given range. Works on `Number`, `String`, and `Date` attribute types. |
| `.includes(...value)` | `.filter('numbers').includes(1, 2, 3)` | Looks within a [Set Attribute](Attributes.md#set-attributes) for any of the specified values. Values must match exactly. |
| `.excludes(...value)` | `.filter('skills').excludes('magic', 'sorcery')` | Looks within a [Set Attribute](Attributes.md#set-attributes) to verify no value matches the specified values. Values must match exactly. Using `.not().includes()` has the same effect. |
| `.contains(value)` | `.filter('email').contains('@example.com')` | Looks at a value to see if it contains the given substring. This can be performed on a [Set Attribute](Attributes.md#set-attributes) to look for partial matches instead of exact matches. |
| `.not().contains(value)` | `.filter('email').not().contains('@example.com')` | Similar to `contains`, except the exact opposite. Values must not contain the given substring. |
| `.null()` | `.filter('someProperty').null()` | Attribute value must exist and the value must be null. |
| `.not().null()` | `.filter('someProperty').not().null()` | Attribute value value must exist and have any value other than null. |
| `.exists()` | `.filter('someProperty').exists()` | Attribute must exist, value can be anything, including `NULL`. |
| `.not().exists()` | `.filter('someProperty').not().exists()` | Attribute must not exist on the record at all. |

### `query.exec()`

This will execute the query you constructed. A promise will be returned that will resolve with [Results](Results.md) the results array upon completion.

```typescript
const results = await Cat.search().filter('name').eq('Will').exec()
```

The `results` you receive back is a standard [Dyngoose.Results](Results.md).

### `query.parenthesis(searchFunction)`

This function takes in a search function instance as a parameter and uses that as a group. This lets you specify the priority of the conditional.

```typescript
const results = await Cat.search()
  .filter('status').eq('alive')
  .and()
  .parenthesis(search => search
    .filter('name').contains('Mr')
    .or()
    .filter('name').contains('Mister')
  )

// this results in a query like:
// status = 'alive' AND (name contains 'Mr' OR name contains 'Mister')
```

Additionally `query.group(searchFunction)` is an alias for `query.parenthesis(searchFunction)`.

### `query.and()`

This is a noop method, but can be used in your call chaining to add clarity to your code.

```typescript
await User.search()
  .filter('status').eq('enabled')
  .and() // using .and() is optional
  .filter('role').eq('admin')
  .exec()

// this results in a query like:
// status = 'enabled' AND role = 'admin'
```

### `query.or()`

This makes an `OR` conditional between the previous condition and the next condition. For more advanced uses, you can use `query.parenthesis()` to create sub-queries.

```typescript
await User.search()
  .filter('email').eq('test@example.com')
  .filter('status').eq('enabled')
  .or() // you can use an OR on the same or different attributes
  .filter('role').eq('admin')
  .exec()

// this results in a query like:
// email = 'test@example.com' AND status = 'enabled' OR role = 'admin'

// to make the query clearer, use query.parenthesis(searchFunction)
await User.search()
  .parenthesis(s => s
    .filter('email').eq('test@example.com')
    .and()
    .filter('status').eq('enabled')
  )
  .or() // you can use an OR on the same or different attributes
  .filter('role').eq('admin')
  .exec()

// this results in a query like:
// (email = 'test@example.com' AND status = 'enabled') OR role = 'admin'

// another .or() example
const search = await Cat.search()
  .filter('name').contains('Mr')
  .or()
  .filter('name').contains('Mister')
  .or() // you can chain multiple ORs together
  .filter('name').contains('Whiskers')

// this results in a query like:
// name contains 'Mr' OR name contains 'Mister' OR name contains 'Whiskers'
```

### `query.limit(limit)`

This function will limit the number of documents that DynamoDB will query in this request. 

**Note**: Unlike SQL databases, DynamoDB's `Limit` does not limit the number of documents in the response, instead DynamoDB will limit the number of documents it evaluates.

For more information, see [Query.Limit](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#Query.Limit) in the Amazon DynamoDB Developer Guide.

```typescript
// Limit query request to 5 documents
const results = await Cat.search().filter('name').eq('Will').limit(5).exec()
```

### `query.startAt(key)`

In the event there are more documents to query in a previous response, Dyngoose will return a `.lastEvaluatedKey` property on the `Dyngoose.Results` response. You can pass that object into this method to further query documents in your table.

```typescript
const search = await Cat.search()
  .filter('name').contains('Mr')
  .or()
  .filter('name').contains('Mister')

const results = search.exec()
const moreDocuments = search.startAt(results.lastEvaluatedKey).exec()
// you do not have to reuse the MagicSearch instance, but you can
```

### `query.attributes(attributes)`

This function will limit which attributes DynamoDB returns for each item in the table. This can limit the size of the DynamoDB response and helps you only retrieve the data you need. The `attributes` property passed into this function should be an array of property names from your `Table` class representing the attributes names you wish DynamoDB to return.

```typescript
const results = await Cat.search()
  .filter('name').eq('Will')
  .attributes('id', 'name')
  .exec()

// Returns all documents but only return the `id` & `name` properties for each item
```

This function uses the `ProjectionExpression` DynamoDB property to save bandwidth and not send the entire item over the wire.

### `query.count()`

Instead of returning an array of documents this function will cause the query operation to return only a count of all documents that match your query's filters. The response will still be an `Dyngoose.Results` (see [Results](Results.md)) but `results.records` will be an empty array.

```typescript
const results = await Cat.search().filter('name').eq('Will').count().exec()
```

Using this option will save bandwidth by setting the DynamoDB `Select` option to `COUNT`.

For more information, see [Count and ScannedCount](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#Query.Count) in the Amazon DynamoDB Developer Guide.

### `query.consistent()`

This will cause the query to run in a consistent manner as opposed to the default eventually consistent manner.

```typescript
const results = await Cat.search().filter('name').eq('Will').consistent().exec()
```

For more information, see [Read Consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html) in the Amazon DynamoDB Developer Guide.

### `query.using(index)`

This causes the query to be run on a specific index as opposed to the default table-wide query. The `index` parameter can either be a reference to the index on the `Table` or the name of the index as a string.

```typescript
// you can specify the index as a reference to the index class on your Table
const results = await Cat.search().filter('name').eq('Will').using(Cat.nameIndex)

// or you can specify the index as a name
const results = await Cat.search().filter('name').eq('Will').using('name-index')
```

### `query.sort(direction)`

This function sorts the documents you receive back by the `rangeKey`. By default, if not provided, it will sort in ascending order.

The order parameter must be a string either equal to `ascending` or `descending`.

```typescript
Cat.search().filter('name').eq('Will').sort('ascending').exec()
Cat.search().filter('name').eq('Will').sort('descending').exec()
```

Additionally, `query.ascending()` and `query.descending()` can be used as shorthand.

This function sets the `ScanIndexForward` property on the query request passed to DynamoDB. This ensures sorting is done on the database side to optimize results.

### `query.all()`

Normally if a query result is more than the AWS query response limit, DynamoDB will provide the `LastEvaluatedKey` and paginates the results so you would have to send multiple requests. This function sends continuous query requests upon receiving a response with a `LastEvaluatedKey` until all documents have been received. This can be useful if you wish to get all the documents matching your query, although the performance can vary greatly.

Similar to `query.exec()` this will execute your query and return your results.

The documents for all of the requests will be aggregated into the `Dyngoose.Results` response.

```typescript
const results = await Cat.search().filter('name').eq('Will').all()
```
