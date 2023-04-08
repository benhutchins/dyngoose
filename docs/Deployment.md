Dyngoose comes with a few utilities to help with deployment out of the box. The recommended way you manage your DynamoDB tables is with [CloudFormation](https://aws.amazon.com/cloudformation/), which will allow you to define all your tables, attributes, indexes, throughput capacity, and streams in an easily managed way. If that doesn't work for you, you can do so from within your application as well, see below for details.

## Deploy using CloudFormation

Each of your tables that extends `Dyngoose.Table` will have a set of utilities exposed through the `schema` object. One utility that is particularly helpful here is the `.schema.createCloudFormationResource()` utility that outputs a set of resources which can be added to a CloudFormation template's `Resources` section.

### Generate with utility

Dyngoose provides a utility to generate the CloudFormation resources for all your tables for you, which an can be run via a task runner such as gulp or grunt:

```typescript
import { join } from 'path'
import { createCloudFormationResources } from 'dyngoose/lib/utils/cloudformation'

export default async function () {
  // this resources part of the Resources you can add to an existing CloudFormation template
  return await createCloudFormationResources({
    tablesDirectory: join(__dirname, 'dist/tables'),
    tableFileSuffix: '.table.js',
  })
}
```

### Generate manually

You can do this yourself, by making a script that imports all your tables, calls that for all your tables, and outputs something that can be saved to a template file. An example for that might be:

```javascript
import { saveFileSync } from 'fs'
import * as Tables from './tables'

const resources = {}

for (const Table of Tables) {
  Object.assign(resources, Table.schema.createCloudFormationResource()
}

saveFileSync('cloudformation.template.json', JSON.stringify({
  Description: 'My DynamoDB Tables',
  Resources: resources,
})
```

### Adding resources to `serverless.yml`

You could also just save the resources and add a line to make them a dependency file in your `serverless.yml` resources section, like:

```javascript
import * as yaml from 'js-yaml'
import { saveFileSync } from 'fs'
import * as Tables from './tables'

const resources = {}

for (const Table of Tables) {
  Object.assign(resources, Table.schema.createCloudFormationResource()
}

saveFileSync('tables.yml', yaml.safeDump(resources))
```

```yml
resources:
  - ${file(./tables.yml)}
```

## Deploy using CDK

For convenience, there is a utility to convert your Dyngoose table into a CDK
table available at `dyngoose/lib/utils/cdk`.

```typescript
// CDK
import { createCDKTable } from 'dyngoose/lib/utils/cdk'
import { User } from './tables/user'

createCDKTable(scope, User.schema)

// SST
export function DB({ app, stack }: StackContext) {
  createCDKTable(stack, User.schema, {
    tableName: app.logicalPrefixedName(User.schema.name),
  })
}
```

## From your Application

To migrate a table from within your application, just call `.schema.migrateTable()` on your `Dyngoose.Table` classes. Dyngoose will describe the table, detecting necessary changes, and will automatically form them. If the table does not exist, it will create it. If new indexes have been added, it will add them.
