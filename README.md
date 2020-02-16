[![Build Status](https://github.com/benhutchins/dyngoose/workflows/workflow/badge.svg)](https://github.com/balmbees/dynamo-types/actions)
[![npm version](https://badge.fury.io/js/dyngoose.svg)](https://badge.fury.io/js/dyngoose)
[![Semantic Release enabled](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com/)


# Dyngoose

Elegant DynamoDB object modeling for Typescript.

Let's face it, all good databases need good model casting. DynamoDB is powerful but libraries that used it were not. That's there where comes in Dyngoose.

## Features

1. Cast your tables, attributes, and indexes using TypeScript classes.
1. Generate your CloudFormation templates based on your code, or perform your table operations on demand.
1. Intelligent and querying.
1. Can convert tables into CloudFormation templates for you.
1. Selectively updating item attributes.
1. Data serialization, cast any JavaScript value into a DynamoDB attribute value.
1. DynamoDB Accelerator (DAX) and Amazon X-Ray support (see [Connections](https://github.com/benhutchins/dyngoose/wiki/connections))
1. Optimizes connection to DynamoDB HTTP service using Keep-Alive, see [Code](https://github.com/benhutchins/dyngoose/blob/master/src/connections/dynamodb-connection.ts#L32
1. Incredibly easy [local development](https://github.com/benhutchins/dyngoose/wiki/development), with supporting for seeding.
1. [Deploy to production](https://github.com/benhutchins/dyngoose/wiki/deployment) using CloudFormation or dynamically.

[Read the docs!](https://github.com/benhutchins/dyngoose/wiki)

## Example Usage
```typescript
import * as Dyngoose from 'dyngoose'

@Dyngoose.$Table({ name: 'Card' })
class Card extends Table {
  @Dyngoose.Attribute.Number()
  public id: number

  @Dyngoose.Attribute.String()
  public title: string

  @Dyngoose.Attribute.Date({ timeToLive: true })
  public expiresAt: Date

  @Dyngoose.$PrimaryKey('id', 'title')
  static readonly primaryKey: Query.PrimaryKey<Card, number, string>

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

const card2 = new Card({
  id: 100,
  title: 'Title'
})

// Save a record
await card.save()

// Batch Put
await Card.documentClient.batchPut([
  new Card(…),
  new Card(…)
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
// Range key operations are stickly typed. (['>=', T] | ['=', T] ...)
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

## dynamo-types

Part of this library is based on [dynamo-types](https://www.npmjs.com/package/dynamo-types) by the guys at [Vingle](https://www.vingle.net/). I want to give them some credit for this library.
