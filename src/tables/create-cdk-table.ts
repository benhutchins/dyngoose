import { type Construct } from 'constructs'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { type Schema } from './schema'

type MutableTableProps = {
  -readonly [key in keyof dynamodb.TableProps]: dynamodb.TableProps[key]
}

export function createCDKTable(scope: Construct, schema: Schema, tableProps: Partial<MutableTableProps> = {}): dynamodb.Table {
  if (tableProps.tableName == null) {
    tableProps.tableName = schema.name
  }

  if (tableProps.partitionKey == null) {
    tableProps.partitionKey = {
      name: schema.primaryKey.hash.name,
      type: schema.primaryKey.hash.type.type as any,
    }
  }

  if (tableProps.sortKey == null && schema.primaryKey.range != null) {
    tableProps.sortKey = {
      name: schema.primaryKey.range.name,
      type: schema.primaryKey.range.type.type as any,
    }
  }

  if (tableProps.billingMode == null) {
    if (schema.options.billingMode === 'PAY_PER_REQUEST') {
      tableProps.billingMode = dynamodb.BillingMode.PAY_PER_REQUEST
    } else if (schema.options.billingMode === 'PROVISIONED') {
      tableProps.billingMode = dynamodb.BillingMode.PROVISIONED
      tableProps.readCapacity = schema.throughput.read
      tableProps.writeCapacity = schema.throughput.write
    }
  }

  if (tableProps.pointInTimeRecovery == null && schema.options.backup === true) {
    tableProps.pointInTimeRecovery = true
  }

  if (tableProps.encryption == null && schema.options.encrypted === true) {
    tableProps.encryption = dynamodb.TableEncryption.AWS_MANAGED
  }

  if (tableProps.timeToLiveAttribute == null && schema.timeToLiveAttribute != null) {
    tableProps.timeToLiveAttribute = schema.timeToLiveAttribute.name
  }

  if (tableProps.stream == null && schema.options.stream != null) {
    if (typeof schema.options.stream === 'boolean') {
      tableProps.stream = dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
    } else if (schema.options.stream.StreamViewType != null) {
      tableProps.stream = schema.options.stream.StreamViewType as any
    }
  }

  const table = new dynamodb.Table(scope, 'Table', tableProps as any)

  if (schema.options.billingMode === 'PROVISIONED') {
    if (schema.throughput.autoScaling === true) {
      table.autoScaleWriteCapacity({
        minCapacity: 1,
        maxCapacity: 10,
      }).scaleOnUtilization({ targetUtilizationPercent: 75 })
    }
  }

  if (schema.localSecondaryIndexes.length > 0) {
    for (const indexMetadata of schema.localSecondaryIndexes) {
      table.addLocalSecondaryIndex({
        indexName: indexMetadata.name,
        projectionType: indexMetadata.projection as any,
        sortKey: {
          name: indexMetadata.range.name,
          type: indexMetadata.range.type.type as any,
        },
        nonKeyAttributes: indexMetadata.nonKeyAttributes,
      })
    }
  }

  if (schema.globalSecondaryIndexes.length > 0) {
    for (const indexMetadata of schema.globalSecondaryIndexes) {
      table.addGlobalSecondaryIndex({
        indexName: indexMetadata.name,
        partitionKey: {
          name: indexMetadata.hash.name,
          type: indexMetadata.hash.type.type as any,
        },
        sortKey: indexMetadata.range == null
          ? undefined
          : {
              name: indexMetadata.range.name,
              type: indexMetadata.range.type.type as any,
            },
        nonKeyAttributes: indexMetadata.nonKeyAttributes,
        projectionType: indexMetadata.projection as any,
        readCapacity: indexMetadata.throughput == null ? tableProps.readCapacity : indexMetadata.throughput.read,
        writeCapacity: indexMetadata.throughput == null ? tableProps.writeCapacity : indexMetadata.throughput.write,
      })
    }
  }

  return table
}
