Indexes are extremely important when working with DynamoDB. There are three kinds of indexes, the [Primary Key](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.PrimaryKey) and two kinds of [Secondary Indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.SecondaryIndexes); [LocalSecondaryIndex](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html)  and [GlobalSecondaryIndex](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html).

Both the Primary Key and all your LocalSecondaryIndex(es) need to be defined at the creation of your table and cannot be changed later. This means it is rather important you understand how your data will be queried to optimize these indexes from the start. You can create and delete Global Secondary Indexes at any time, but you cannot update the `Projection` or `KeySchema` for Global Secondary Indexes, so when making changes you'll often have to rename the index so the old index is deleted and a new one is created.

In Dyngoose, you define all of your indexes in code by attaching properties tagged with specific decorators to tell Dyngoose what you'd like added to your table.

```typescript
@Dyngoose.$Table()
class MyTable extends Dyngoose.Table {

  // define your PrimaryKey index
  @Dyngoose.$PrimaryKey('your hash key attribute name', 'your range key attribute name')
  public static readonly primaryKey: Dyngoose.Query.PrimaryKey<MyTable, string, string>

  // define your LocalSecondaryIndex(es)
  @Dyngoose.$LocalSecondaryIndex('your range key attribute name') // you can optionally define a name in the second argument
  public static readonly lsi: Dyngoose.Query.LocalSecondaryIndex<MyTable>

  // define your GlobalSecondaryIndex(es)
  @Dyngoose.$GlobalSecondaryIndex({ hashKey: '…', 'rangeKey: '…' }) // there are more options
  public static readonly gsi: Dyngoose.Query.GlobalSecondaryIndex<MyTable>
}
```
