[![Build Status](https://github.com/benhutchins/dyngoose/workflows/workflow/badge.svg)](https://github.com/benhutchins/dyngoose/actions)
[![npm version](https://badge.fury.io/js/dyngoose.svg)](https://badge.fury.io/js/dyngoose)
[![Semantic Release enabled](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)


# Dyngoose

Elegant DynamoDB object modeling for Typescript.

Let's face it, all good databases need good model casting. DynamoDB is powerful but libraries for it were not. That's where Dyngoose comes in.

## Getting Started

[Take a look the docs!](https://github.com/benhutchins/dyngoose/blob/master/docs/Home.md) to find information about how to get started.

## Features

1. Cast your tables, attributes, and indexes using TypeScript interfaces.
1. Generate your CloudFormation template resources, CDK constructs based on your code, or perform your table operations on demand; see [Deployment](./docs/Deployment.md).
1. Intelligent and powerful querying syntax, see [Querying](./docs/Querying.md) and [MagicSearch](./docs/MagicSearch.md).
1. Selectively update item attributes, prevents wasteful uploading of unchanged values.
1. Data serialization, cast any JavaScript value into a DynamoDB attribute value.
1. Amazon X-Ray support, see [Connections](./docs/Connections.md).
1. Incredibly easy [local development](./docs/Development.md), with support for seeding a local database.
1. Supports [conditional writes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.ConditionalUpdate), see [Saving](./docs/Saving.md#saveconditions).
1. Use `AsyncGenerators` to page through results efficiently, see [MagicSearch](./docs/MagicSearch.md).

NOTE: DynamoDB Accelerator (DAX) support has been dropped as DAX is not yet supported by aws-sdk v3, see [aws-sdk-js-v3#4263](https://github.com/aws/aws-sdk-js-v3/issues/4263).

## Example Usage
```typescript
import { Dyngoose } from 'dyngoose'

@Dyngoose.$Table({ name: 'Card' })
class Card extends Dyngoose.Table {
  @Dyngoose.Attribute.Number()
  public id: number

  // Dyngoose supports inferring the attribute types based on the object types
  // of your values, however, you can also specify strict attribute types,
  // which offers more utilities
  @Dyngoose.Attribute()
  public title: string

  @Dyngoose.Attribute()
  public number: number

  @Dyngoose.Attribute.String({ trim: true })
  public description: string

  @Dyngoose.Attribute.StringSet()
  public owners: Set<string>

  @Dyngoose.Attribute.Date({ timeToLive: true })
  public expiresAt: Date

  @Dyngoose.$PrimaryKey('id', 'title')
  static readonly primaryKey: Dyngoose.Query.PrimaryKey<Card, number, string>

  @Dyngoose.$DocumentClient()
  static readonly documentClient: Dyngoose.DocumentClient<Card>
}

// Perform table operations
await Card.createTable()
await Card.deleteTable()

// Creating records
const card = new Card()
card.id = 100
card.title = 'Title'

// note: Card.new is correct, this is a custom method that allows for a strongly-typed object
const card2 = Card.new({
  id: 100,
  title: 'Title'
})

// Save a record
await card.save()

// Batch Write
const batchWrite = new Dyngoose.BatchWrite()
batchWrite.put(
  Card.new(…),
  Card.new(…)
)
await batchWrite.commit()

// Get record by the primary key
await Card.primaryKey.get({ id: 100, title: 'Title' })

// Batch Get
const batchGet = new Dyngoose.BatchGet()

batchGet.get(
  Card.primaryKey.fromKey({ id: 100, title: 'Title' }),
  Card.primaryKey.fromKey({ id: 100, title: 'Title' })
)

await batchGet.retrieve()

// Searching and Advanced Querying
// Your values will be strictly typed based on the attribute being filtered
await Card.search()
  .filter('id').eq(100)
  .and()
  .filter('title').gte('Title')
  .exec()

// Easily delete record
await card.delete()

// Query
// Queries are always strongly typed. (['>=', T] | ['=', T] ...)
const cards = await Card.primaryKey.query({
  id: 100,
  title: ['>=', 'Title']
})

// You can loop through outputs, which is a native JavaScript array
for (const card of cards) {
  console.log(card.id, card.title)
}

// The output contains additional properties
console.log(`Your query returned ${cards.count} and scanned ${cards.scannedCount} documents`)

// Atomic counters, advanced update expressions
// Increment or decrement automatically, based on the current value in DynamoDB
card.set('number', 2, { operator: 'increment' }) // if the current value had been 5, it would now be 7
card.set('number', 2, { operator: 'decrement' }) // if the current value had been 5, it would now be 3

// Use the add or remove operator on Sets to only partially change an attribute
card.set('owners', ['some value'], { operator: 'add' })

// Use an abort controller all on read requests
const abortController = new AbortController()
await Card.primaryKey.get({ id: 10, title: 'abc' }, { abortSignal: abortController.signal })
abortController.abort()
```

### TS Compiler Setting
Dyngoose utilizes TypeScript decorators, to use them you must enable them within your `tsconfig.json` file:

```json
{
    "compilerOptions": {
        // other options…
        //
        "experimentalDecorators": true, // required
        "emitDecoratorMetadata": true // required
    }
}
```

## Honorable mentions

I originally based a lot of of this work on [Dynamoose](https://github.com/dynamoosejs/dynamoose), reworking it for TypeScript and adding adding better querying logic. About two years later, I pulled in some work from [dynamo-types](https://github.com/balmbees/dynamo-types) and reworked it further to make what has become Dyngoose. I want to thank the creators and all the people who worked on both of those projects.
