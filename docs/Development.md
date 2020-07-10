The easiest way to setup local development when working with Dyngoose, or DynamoDB in any capacity, is usually to use their official Docker image; however, Dyngoose supports [local-dynamo](https://www.npmjs.com/package/local-dynamo) just as easily.

Below are the various ways you can run a DynamoDB service locally when developing your application. Once you have a DynamoDB service running, to configure DynamoDB you can do one of the following:

```javascript
// put this at the start of your script
process.env.DYNAMO_ENDPOINT = 'http://localhost:8000'
```

Or you can configure the environmental variable outside of Node.js, a great place to set this up could be your `package.json` file or within an the `environment` configuration in your `serverless.yml` file if you are using [serverless](https://www.serverless.com).

You can also configure the connection within Node.js directly, see [Connections](Connections.md).

## Official Amazon DynamoDB Docker image

[Docker](https://www.docker.com/) is a great tool for running services during develop, and is the recommend way you run a DynamoDB service locally.

https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.Docker.html

Within your project, you can create a `docker-compose.yml` file and either clone ours or copy the example below.

```yaml
version: "3"

services:
  dynamodb:
    image: amazon/dynamodb-local
    ports:
      - "8000:8000”
    networks:
      - development

  dynamodb-admin:
    image: aaronshaf/dynamodb-admin
    environment:
      AWS_REGION: localhost
      AWS_ACCESS_KEY_ID: abcde
      AWS_SECRET_ACCESS_KEY: abcde
      DYNAMO_ENDPOINT: http://dynamodb:8000
    ports:
      - "8001:8001"
    networks:
      - development

networks:
  development:
```

## local-dynamo

[local-dynamo](https://www.npmjs.com/package/local-dynamo) is a third-party utility to create a local HTTP endpoint that emulates DynamoDB's implementation, it's extremely easy to use and quite popular as a development tool for DynamoDB developers.

Please read more on [Medium/local-dynamo](https://github.com/Medium/local-dynamo).

Here is the general way to use:

```bash
# install local-dynamo
npm install --save-dev local-dynamo

# launch the service, this can also easily be added to your package.json
npx local-dynamo --port 8000
```

## Official Amazon DynamoDB Java applet

Amazon provides an official DynamoDB development utility, which the Docker images internally uses as well. It’s a Java application and can be setup easily. Please see Amazon’s guide:

https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html