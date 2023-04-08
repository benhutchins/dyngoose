I'm glad that you want to get started Dyngoose!

Here is a simple "Getting Started" tutorial:

## Install Dyngoose

```npm install --save dyngoose```

For best practice, I recommend putting all your table definitions into a single directory and give each table a common file suffix. Popular folder names are `tables` and `models`. Common file suffixes are `.table.ts` and `.model.ts`. This helps if you want to use some of the [deployment utilities](Deployment.md) Dyngoose comes with.

```mkdir -p src/tables```

## Start creating Tables

Let's get started with a simple table, just create a file called `tables/User.table.ts`. Dyngoose tries to provide everything commonly needed directly on the Dyngoose main export, simply import it into your new table file:

```typescript
import { Dyngoose } from 'dyngoose'
```

Now let's start building out your table structure!

Dyngoose relies on [TypeScript decorators](https://www.typescriptlang.org/docs/handbook/decorators.html), which is currently experimental. You will need to enable them within your `tsconfig.json`. These are also used by popular projects such as [Angular](https://angular.io/) and make using Dyngoose really easy!

Let's see a sample table defined, then I'll walk through the code line-by-line.

```typescript
import { Dyngoose } from 'dyngoose'
import * as uuid from 'uuid/v4'

@Dyngoose.$Table({
  name: 'User',
})
class User extends Dyngoose.Table {
  @Dyngoose.Attribute.String({ default: () => uuid() })
  public id: string

  @Dyngoose.Attribute.String()
  public email: string

  @Dyngoose.$PrimaryKey('id')
  static readonly primaryKey: Dyngoose.Query.PrimaryKey<User, string>

  @Dyngoose.$GlobalSecondaryIndex({ hashKey: 'email' })
  static readonly emailIndex: Dyngoose.Query.GlobalSecondaryIndex<User>
}
```

Now, let's look at what is happening.

```typescript
@Dyngoose.$Table({
  name: 'User',
})
```

`@Dyngoose.$Table` is the table decorator. Here you pass your configuration for the table you are defining. You can read about all the options for a table on the [Table documentation page](Table.md). Here, I am setting the table's name to `User`. You can also specify the billing mode, throughput, enable auto-scaling, enable a [DynamoDB Stream](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html) and more.

Let's continue on!

```typescript
class User extends Dyngoose.Table {
```

Each table you create must extend the `Dyngoose.Table` class. This class provides you with all the wonderful methods you can see in [`table.ts`](https://github.com/benhutchins/dyngoose/blob/master/src/table.ts) and detailed out in [Table documentation](https://github.com/benhutchins/dyngoose/blob/master/src/table.ts).

```typescript
  @Dyngoose.Attribute.String({ default: () => uuid() })
  public id: string

  @Dyngoose.Attribute.String()
  public email: string
```

Now we're starting to define the attributes for the table. If this were SQL, think of attributes as columns. Each attribute must be defined using a decorator as well. If you have a property on the table without a decorator, the value will not be saved because Dyngoose will not be able to learn about the property. For all the available attribute types, read the [Attributes documentation](Attributes.md).

For the definition of the `id` property, we've defined it as a `String`, which tells Dyngoose how to format the [DynamoDB AttributeValue](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_AttributeValue.html).

We're also defining a `default` handler for the `id` property, which Dyngoose will evaluate whenever the attribute is first read or the record is being saved. In this example, I have the `id` property become a a randomly generated UUID value. Since the property is later defined as the `HASH` key for the table, DynamoDB will prevent duplicate IDs from existing (in the unlikely event two records generate with the same UUID).

Let's see what comes next

```
  @Dyngoose.$PrimaryKey('id')
  static readonly primaryKey: Dyngoose.Query.PrimaryKey<Card, string>
```

Here we are defining the table's [Primary Key](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.PrimaryKey). In this example we are only defining the `HASH` key, DynamoDB also calls this the "Partition key". If you were to provide a second property name to the `@Dyngoose.$PrimaryKey` decorator, that would be defined as the table's range key.

On the next line, we're creating a static `primaryKey` property on the `User` table class. This will allow you to perform actions on the table using the primary key for operations such as `GetItem`, `Query`, and `Scan`. You can read more on the [Querying documentation page](Querying.md). The `Dyngoose.Query.PrimaryKey` class will also provide you with other useful methods to update or delete an item by it's key without loading the record first, which can be useful while performing many types of operations.

```typescript
  @Dyngoose.$GlobalSecondaryIndex({ hashKey: 'email' })
  static readonly emailIndex: Dyngoose.Query.GlobalSecondaryIndex<Card>
```

Lastly, we've defined a [GlobalSecondaryIndex](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html), often referred to as a GSI. This allows you to query the table by a hash and an optional range. In this example, we've created a GSI with only a hash key set to the `email` attribute.

The `emailIndex` property we've defined will become an instance of the `Dyngoose.Query.GlobalSecondaryIndex` class. Another powerful querying helper, it will let you perform queries and scans on this index.

You can read more on the [Indexes documentation](Indexes.md).

## Creating records

Now that we've created a table, let's start creating records.

The simplest way to create a record is using the `.new` method on your table class.

```typescript
const user = User.new({
  email: 'jane@example.com',
})
```

Here we've just created an instance of the `User` class. The `.new` method is strongly typed, so it helps autocomplete all the possible properties of the `User` table. You can also do `new User({ … })` except it is not typed at all, a small limitation of TypeScript.

Now that you have started to create a record, you may want to save the record!

```typescript
await user.save()
```

That's it! Dyngoose will save the record or any updates that are waiting to be changed. It's optimized to perform an `UpdateItem` request when possible, to avoid re-uploading the entire record on each save, very useful if you are dealing with large records.

Upon saving, Dyngoose will evaluate the default handler for the `id` property, and now your `user` object will have an `id`.

```typescript
console.log(user.id) // 49704127-28e9-4e16-ad04-3bd1b639feec or something like it
```

You may want to make some changes to the record, you can do that!

```typescript
user.email = 'john@example.com'

await user.save()
```

Now you've modified the record and saved the changes.

## Querying for records

Dyngoose provides many useful ways to query for your records, you can read about all the methods on the [Querying documentation](Querying.md).

For now, let's look at the `.search` method.

```typescript
const users = await User.search({ email: 'john@example.com' })
```

The `.search` method is strongly typed as well, to help you provide the right value types and the right property names. In TypeScript, it'll help you autocomplete your query filters.

The `.search` method is very intelligent. It will detect you have an index named `emailIndex` and will automatically use it to query for your desired record efficiently.

Alternatively, you can use the `emailIndex` property to be more strict about your queries:

```typescript
const users = await User.emailIndex.query({ email: 'john@example.com' })
```

In Dyngoose, all query and scan operations support providing filters and conditions and will be strongly typed. This operation is nearly identical to using the `.search` method except that it always use the `emailIndex` GSI.

Using the .`search` method, if you want to perform a search that does not have an available index, Dyngoose will automatically perform a table scan for you.

```typescript
const users = await User.search({ email: ['contains', '@example.com'] })
```

Here we've specified a slightly more complex query, however, Dyngoose knows that you cannot use the `contains` query operator on a table key in DynamoDB and will fallback to using a scan for you.

## Getting advanced

By now, you've learned all the basics for using DynamoDB with Dyngoose. Please read the other documentation pages for more advanced information.
