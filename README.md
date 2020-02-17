[![Build Status](https://github.com/benhutchins/dyngoose/workflows/workflow/badge.svg)](https://github.com/balmbees/dynamo-types/actions)
[![npm version](https://badge.fury.io/js/dyngoose.svg)](https://badge.fury.io/js/dyngoose)
[![Semantic Release enabled](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com/)


# Dyngoose

Elegant DynamoDB object modeling for Typescript.

Let's face it, all good databases need good model casting. DynamoDB is powerful but libraries that used it were not. That's where Dyngoose comes in.

[Read the docs!](https://github.com/benhutchins/dyngoose/wiki)

## Features

1. Cast your tables, attributes, and indexes using TypeScript classes.
1. Generate your CloudFormation templates based on your code, or perform your table operations on demand; see [Deployment](https://github.com/benhutchins/dyngoose/wiki/deployment).
1. Intelligent and powerful querying syntax, see [Querying](https://github.com/benhutchins/dyngoose/wiki/Querying).
1. Selectively update item attributes, prevents wasteful uploading of unchanged values.
1. Data serialization, cast any JavaScript value into a DynamoDB attribute value.
1. DynamoDB Accelerator (DAX) and Amazon X-Ray support, see [Connections](https://github.com/benhutchins/dyngoose/wiki/Connections).
1. Optimizes connection to DynamoDB HTTP service using Keep-Alive, see [Code](https://github.com/benhutchins/dyngoose/blob/master/src/connections/dynamodb-connection.ts#L32).
1. Incredibly easy [local development](https://github.com/benhutchins/dyngoose/wiki/development), with supporting for seeding a local database.
1. Supports [conditional writes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.ConditionalUpdate), see [Saving](https://github.com/benhutchins/dyngoose/wiki/Saving#saveconditions).

## Example Usage
```typescript
import * as Dyngoose from 'dyngoose'

@Dyngoose.$Table({ name: 'Card' })
class Card extends Dyngoose.Table {
  @Dyngoose.Attribute.Number()
  public id: number

  @Dyngoose.Attribute.String()
  public title: string

  @Dyngoose.Attribute.Date({ timeToLive: true })
  public expiresAt: Date

  @Dyngoose.$PrimaryKey('id', 'title')
  static readonly primaryKey: Dyngoose.Query.PrimaryKey<Card, number, string>

  @Dyngoose.$DocumentClient()
  static readonly writer: Dyngoose.DocumentClient<Card>
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

// Batch Put
await Card.documentClient.batchPut([
  Card.new(…),
  Card.new(…)
])

// Get record by the primary key
await Card.primaryKey.get(100, 'Title')

// BatchGet
// This array is strongly typed such as Array<[number, string]> so don't worry.
await Card.primaryKey.batchGet([
  [100, 'Title'],
  [200, 'Title2']
])

// Query
// Queries are always strongly typed. (['>=', T] | ['=', T] ...)
await Card.primaryKey.query({
  id: 100,
  title: ['>=', 'Title']
})

// Delete record
await card.delete()
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
