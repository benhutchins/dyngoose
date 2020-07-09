Dyngoose supports connecting to your DynamoDB tables through plain DynamoDB connections through HTTP and through DynamoDB Accelerator (DAX). Dyngoose allows each table to have a separate connection.

## DynamoDB through HTTP (default)

This is the default connection type, and is not necessary to configure if you want to connect through your default AWS credentials. You can specify a connection if you need to have a specific set of tables use a different connection.

You can also use a custom connection to enable AWS X-Ray support for specific tables.

```typescript
@Dyngoose.Table({
  // …
  connection: new Dyngoose.Connection.DynamoDBConnection({({
    endpoint: …,
    enableAWSXray: true,
  })
})
class Card extends Dyngoose.Table {
  // …
}
```

### AWS X-Ray Support

AWS X-Ray is a serverless distributed tracing service. In order to log DynamoDB transaction into it. You can turn it on by setting an environmental variable or by adding `process.env.ENABLE_XRAY = "true"` to your process being importing Dyngoose, or as demonstrated above, by creating a custom `Dyngoose.DynamoDBConnection` and specifying `enableAWSXray: true`.

## DynamoDB Accelerator (DAX)

```typescript
@Dyngoose.Table({
  // …
  connection: new Dyngoose.Connection.DAXConnection({
    endpoints: ['dax-domain:8892']
  })
})
class Card extends Dyngoose.Table {
  // …
}
```

