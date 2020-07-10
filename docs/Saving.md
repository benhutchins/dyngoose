Most of the time, you only need to call `record.save()`, however, sometimes you need to do a bit more.

## `.save([conditions])`

The most common way to save is just to call `record.save()`. Dyngoose will automatically perform an `UpdateItem` operation if it is possible, to only update the attributes you have changed; but if it is a new record it'll perform a `PutItem` operation.

You can optionally pass conditions, which will perform a [Condition Write](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.ConditionalUpdate). Conditions use the same syntax as [query filter conditions](Querying.md#filter-conditions). Specifying conditions can help avoid race conditions in situations where multiple processes may be updating the same record.

## `Dyngoose.DocumentClient.batchPut`

Perform a batch put of records. This can be used to update or create records in bulk.

```typescript
@Dyngoose.$Table()
class User extends Dyngoose.Table { … }

await User.documentClient.batchPut([
  User.new(…),
  User.new(…)
])
```

## Updating an item without loading it

If you want to perform an `UpdateItem` operation without having to load the existing record first (extremely useful when operating large or batch operations).

### Table.fromKey

The `Table.fromKey` lets you create an instance of a `Table` without loading the record. For example:

```typescript
@Dyngoose.$Table()
class User extends Dyngoose.Table {
  primaryKey: Dyngoose.Query.PrimaryKey<User>

  @Dyngoose.Attribute.Number()
  id: number

  @Dyngoose.Attribute.String()
  name: string
}

const user = User.fromKey({ id: 1 })
user.name = 'test'
await user.save()
```

### Dyngoose.Query.PrimaryKey.update

The `.primaryKey.update` method also works, although it internally uses the `Table.fromKey()` method and then calls a `record.fromJSON(…)` passing in your `changes`. The `changes` object is strongly typed.

```
await User.primaryKey.update({
  hash: 'john@example.com', // specify the value for your record's HASH attribute
  // range: … // specify the value for your record's RANGE attribute, required if the table has a range key
  changes: {
    someString: 'maybe',
    someBoolean: false,
  },
})
```
