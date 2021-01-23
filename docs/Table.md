Your data modeling starts with a `Dyngoose.$Table`.

### Options

To start defining your tables, you use the `Dyngoose.$Table` decorator. It accepts a few options you can set on your table. All the options are currently optional, although it is highly recommended you define a `name` for your table, see below.

See [src/metadata/table.ts](https://github.com/benhutchins/dyngoose/blob/master/src/metadata/table.ts) for all the table options.

| Name | Description | Default |
|-|-|-|
| `name` | Define a table name. | Defaults to the class name of your table. |
| `throughput` | Define the throughput for your table. | Defaults to AWS default, which is auto-scaling enabled with a minimum of 5 read and 5 write capacity units. When not using CloudFormation, auto-scaling configuration is not created. |
| `billingMode` | Define the [billing mode](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html) for your table. | Defaults to `PROVISIONED`, but can set it to `PAY_PER_REQUEST`. |
| `encrypted` | Enables [encryption-at-rest](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/EncryptionAtRest.html) using AWS managed CMK for the table. Because all user data stored in Amazon DynamoDB is fully encrypted at rest, leaving this as the default `false` value does not mean your data will be stored in clear text. | `false` |
| `stream` | Enables a [DynamoDB Stream](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html) for the table. | `false` |
| `connection` | Specify a DynamoDB connection other than the default. | Uses the default connection. See [Connections](Connections.md). |
| `backup` | Enables [Point-in-Time Recovery](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html) for the table. | `false` |

### Table methods

Each table must extend the `Dyngoose.Table` class.

Lots of documentation exists in code in [`src/table.ts`](https://github.com/benhutchins/dyngoose/blob/master/src/table.ts).

### Example

```typescript
@Dyngoose.$Table({
})
class Product extends Dyngoose.Table {
  @Dyngoose.$PrimaryKey('id')
  public static readonly primaryKey: Dyngoose.Query.PrimaryKey<Product, string>

  @Dyngoose.$GlobalSecondaryIndex({ hashKey: 'urlSafeName', name: 'UrlSafeIndex', projection: 'INCLUDE', nonKeyAttributes: ['id', 'name'] })
  public static slugIndex: Dyngoose.Query.GlobalSecondaryIndex<Product>

  @Dyngoose.Attribute.Number()
  public id: string

  @Dyngoose.Attribute.String()
  public name: string

  @Dyngoose.Attribute.String()
  public urlSafeName: string

  @Dyngoose.Attribute.Number({ name: 'inventory_count' })
  public inventoryCount: number

  @Dyngoose.Attribute.Date({ nowOnCreate: true })
  public createdAt: Date

  @Dyngoose.Attribute.Date({ nowOnUpdate: true })
  public updatedAt: Date
}
```

#### Getter and Setter properties

Dyngoose uses getters and setters (aka accessor methods and mutator methods respectively) for all properties that uses an attribute decorator (`@Dyngoose.Attribute()`). This means you cannot redefine a getter and setter for your attributes, you could try something like:

```typescript
class Person extends Dyngoose.Table {
  @Dyngoose.Attribute.Number({ name: 'height' })
  private __height: string

  get height(): string {
    return this.__height
  }

  set height(height: string) {
    // standardize height…
    this.__height = height
  }
}
```

#### Custom methods

You can define custom methods on your `Table` classes, or even create a base class for your tables.

```typescript
class BaseTable extends Dyngoose.Table {
  async afterSave() {
    EventLogger(…)
  }
}
```

#### Hooks

There are several methods available as hooks if you desire to add additional validation and logic to your table.

Some useful hooks are:

| Hook | Purpose |
|-|-|
| `beforeSave` | Called before a record is saved, you can manipulate the data or perform validation and throw an `Error`. |
| `afterSave` | Called after a record is saved, you could use this to perform logging or analytics. Also consider using a [DynamoDB Stream](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html). |
| `beforeDelete` | Called before a record is deleted, you can perform validation and prevent accidental deletion. |
| `afterSave` | Called after a record is deleted, you could use this to perform logging or analytics. |
| `getBlacklist` | Called to get a list of attributes you do not want to allow to be updated through the `.fromJSON` method. By default the HASH key is not allowed to be updated through the `.fromJSON` method. |
