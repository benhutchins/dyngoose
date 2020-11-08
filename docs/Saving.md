# Saving

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

### Table.primaryKey.fromKey(…)

The `Table.primaryKey.fromKey` method lets you create an instance of a `Table` without loading the record.
There can be many situations where this can be helpful. It allows you to perform partial updates of records
or delete a record easily without loading it. For example:

```typescript
@Dyngoose.$Table()
class User extends Dyngoose.Table {
  @Dyngoose.$PrimaryKey('id')
  primaryKey: Dyngoose.Query.PrimaryKey<User, string, void>

  @Dyngoose.Attribute.Number()
  id: number

  @Dyngoose.Attribute.String()
  name: string
}

// fromKey accepts filters, which must contain the hash key property and range key property (if the table has a range key)
const user1 = User.primaryKey.fromKey({ id: 1 })
user1.name = 'test'
await user1.save()

// you can also pass the hash key value and the range key value as arguments directly to fromKey
const user2 = User.primaryKey.fromKey(1)
await user2.delete()
```

### Dyngoose.Query.PrimaryKey.update

The `.primaryKey.update` method also works, although it internally uses the `Table.primaryKey.fromKey()` method and then calls a `record.fromJSON(…)` passing in your `changes`. The `changes` object is strongly typed.

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
