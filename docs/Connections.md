Dyngoose supports connecting to your DynamoDB tables through plain DynamoDB connections through HTTP and through DynamoDB Accelerator (DAX). Dyngoose allows each table to have a separate connection.

## Access

Configure how Dyngoose will have permission to perform operations on your table(s). Dyngoose relies on [AWS-SDK](https://www.npmjs.com/package/aws-sdk) which requires you provide valid credentials to successfully make requests to DynamoDB.

### Using an Access Key

One method for configuring access to DynamoDB is using [Access Keys](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html#access-keys-and-secret-access-keys). You will need to generate you access key and then ensure it is available to your process securely.

#### Environmental Variables

You can use environment variables to setup your configuration. These are automatically read by the AWS SDK and never read directly by Dyngoose.

```bash
export AWS_ACCESS_KEY_ID = "Your AWS Access Key ID"
export AWS_SECRET_ACCESS_KEY = "Your AWS Secret Access Key"
export AWS_REGION = "us-east-1"
```

Alternatively, Dyngoose does attempt to look for Dyngoose-specific environmental variables that can be used to configure a unique access key for Dyngoose.

```bash
export DYNAMO_ENDPOINT = ""
export DYNAMO_ACCESS_KEY_ID = ""
export DYNAMO_SECRET_ACCESS_KEY = ""
export DYNAMO_REGION = "us-east-1"
```

Dyngoose also looks for `ENABLE_XRAY` and when set to `true` will turn on [AWS X-Ray](https://aws.amazon.com/xray/) for better tracing and debugging functionality.

```bash
export ENABLE_XRAY = 'true'
```

#### Programmatically

You can also provide your credentials from within your process.
###### Global

```typescript
// Dyngoose provides a wrapper for the aws-sdk v3 DynamoDB Client that adds x-ray support
Dyngoose.Config.defaultConnection = new Dyngoose.Connection.DynamoDBConnection({
  endpoint: '…',
  region: '…',
  credentials: {
    accessKeyId: '…',
    secretAccessKey: '…',
  },
})

// or you can provide a DynamoDB Client directly
import { DynamoDB } from '@aws-sdk/client-dynamodb'
Dyngoose.Config.defaultConnection = new DynamoDB({
  endpoint: '…',
  region: '…',
  credentials: {
    accessKeyId: '…',
    secretAccessKey: '…',
  },
})
```

Alternatively you can configure a connection using [DynamoDB Accelerator (DAX)](#DynamoDB-Accelerator-DAX) below.

###### Table-Specific

### Using an IAM Role

If you are running Dyngoose in an environment that has an IAM role attached to it (e.g. Lambda or EC2), you do not need configure any additional access settings so long as your IAM role has appropriate permissions to access DynamoDB.

## Connections

### DynamoDB through HTTP (default)

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

#### AWS X-Ray Support

AWS X-Ray is a serverless distributed tracing service. In order to log DynamoDB transaction into it. You can turn it on by setting an environmental variable or by adding `process.env.ENABLE_XRAY = "true"` to your process being importing Dyngoose, or as demonstrated above, by creating a custom `Dyngoose.DynamoDBConnection` and specifying `enableAWSXray: true`.

### DynamoDB Accelerator (DAX)

[DynamoDB Accelerator (DAX)](https://aws.amazon.com/dynamodb/dax/) is a fully managed, highly available, in-memory cache for DynamoDB that delivers great performance.

Dyngoose historically has supported DAX natively, however, DAX is not yet supported by aws-sdk v3 (see see [aws-sdk-js-v3#4263](https://github.com/aws/aws-sdk-js-v3/issues/4263)) so the support has been dropped until official DAX support is brought to `@aws-sdk/client-dynamodb`.



#### Globally

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
