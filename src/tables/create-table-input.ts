import { type CreateTableCommandInput, type GlobalSecondaryIndex, type KeySchemaElement, type LocalSecondaryIndex } from '@aws-sdk/client-dynamodb'
import { uniqBy } from 'lodash'
import { type Attribute } from '../attribute'
import { SchemaError } from '../errors'
import { type Schema } from './schema'
import { DEFAULT_READ_CAPACITY, DEFAULT_WRITE_CAPACITY } from './defaults'

export function createTableInput(schema: Schema, forCloudFormation = false): CreateTableCommandInput {
  const params: CreateTableCommandInput = {
    TableName: schema.name,
    AttributeDefinitions: [
      {
        AttributeName: schema.primaryKey.hash.name,
        AttributeType: schema.primaryKey.hash.type.type,
      },
    ],
    KeySchema: [
      {
        AttributeName: schema.primaryKey.hash.name,
        KeyType: 'HASH',
      },
    ],
  }

  if (schema.options.billingMode === 'PAY_PER_REQUEST') {
    params.BillingMode = 'PAY_PER_REQUEST'
  } else if (schema.options.billingMode === 'PROVISIONED') {
    params.ProvisionedThroughput = {
      ReadCapacityUnits: schema.throughput?.read ?? DEFAULT_READ_CAPACITY,
      WriteCapacityUnits: schema.throughput?.write ?? DEFAULT_WRITE_CAPACITY,
    }
  }

  if (schema.primaryKey.range != null) {
    params.AttributeDefinitions!.push({
      AttributeName: schema.primaryKey.range.name,
      AttributeType: schema.primaryKey.range.type.type,
    })

    params.KeySchema!.push({
      AttributeName: schema.primaryKey.range.name,
      KeyType: 'RANGE',
    })
  }

  if (schema.options.encrypted === true) {
    if (forCloudFormation) {
      (params as any).SSESpecification = {
        SSEEnabled: true,
      }
    } else {
      params.SSESpecification = { Enabled: true }
    }
  }

  if (schema.options.backup === true) {
    if (forCloudFormation) {
      (params as any).PointInTimeRecoverySpecification = {
        PointInTimeRecoveryEnabled: true,
      }
    }
  }

  if (schema.options.stream != null) {
    if (typeof schema.options.stream === 'boolean') {
      params.StreamSpecification = {
        StreamEnabled: true,
        StreamViewType: 'NEW_AND_OLD_IMAGES',
      }
    } else {
      params.StreamSpecification = schema.options.stream
    }

    // CloudFormation template syntax is slightly different than the input for the CreateTable operation
    // so we delete the StreamEnabled because it is not valid within CloudFormation templates
    if (forCloudFormation) {
      delete (params.StreamSpecification as any).StreamEnabled
    }
  }

  if (schema.localSecondaryIndexes.length > 0) {
    params.LocalSecondaryIndexes = schema.localSecondaryIndexes.map((indexMetadata) => {
      const KeySchema: KeySchemaElement[] = [
        {
          AttributeName: schema.primaryKey.hash.name,
          KeyType: 'HASH',
        },
        {
          AttributeName: indexMetadata.range.name,
          KeyType: 'RANGE',
        },
      ]

      // make sure this attribute is defined in the AttributeDefinitions
      if (params.AttributeDefinitions!.find((ad) => indexMetadata.range.name === ad.AttributeName) == null) {
        params.AttributeDefinitions!.push({
          AttributeName: indexMetadata.range.name,
          AttributeType: indexMetadata.range.type.type,
        })
      }

      const index: LocalSecondaryIndex = {
        IndexName: indexMetadata.name,
        KeySchema,
        Projection: {
          ProjectionType: indexMetadata.projection == null ? 'ALL' : indexMetadata.projection,
        },
        // Projection: indexMetadata.projection,
      }

      if (indexMetadata.nonKeyAttributes != null && indexMetadata.nonKeyAttributes.length > 0) {
        if (indexMetadata.projection !== 'INCLUDE') {
          throw new SchemaError(`Invalid configuration for LocalSecondaryIndex ${schema.name}/${indexMetadata.name}. nonKeyAttributes can only be used with projection INCLUDE.`)
        }

        index.Projection!.NonKeyAttributes = indexMetadata.nonKeyAttributes
      }

      return index
    })
  }

  if (schema.globalSecondaryIndexes.length > 0) {
    params.GlobalSecondaryIndexes = schema.globalSecondaryIndexes.map((indexMetadata) => {
      const KeySchema: KeySchemaElement[] = [{
        AttributeName: indexMetadata.hash.name,
        KeyType: 'HASH',
      }]

      // make sure this attribute is defined in the AttributeDefinitions
      if (params.AttributeDefinitions!.find((ad) => indexMetadata.hash.name === ad.AttributeName) == null) {
        params.AttributeDefinitions!.push({
          AttributeName: indexMetadata.hash.name,
          AttributeType: indexMetadata.hash.type.type,
        })
      }

      if (indexMetadata.range != null) {
        // make sure the rangeKey is defined in the AttributeDefinitions
        if (params.AttributeDefinitions!.find((ad) => (indexMetadata.range as Attribute<any>).name === ad.AttributeName) == null) {
          params.AttributeDefinitions!.push({
            AttributeName: indexMetadata.range.name,
            AttributeType: indexMetadata.range.type.type,
          })
        }

        KeySchema.push({
          AttributeName: indexMetadata.range.name,
          KeyType: 'RANGE',
        })
      }

      // by default, indexes will share the same throughput as the table
      const throughput = indexMetadata.throughput == null ? schema.throughput : indexMetadata.throughput

      const index: GlobalSecondaryIndex = {
        IndexName: indexMetadata.name,
        KeySchema,
        Projection: {
          ProjectionType: indexMetadata.projection == null ? 'ALL' : indexMetadata.projection,
        },
      }

      if (schema.options.billingMode !== 'PAY_PER_REQUEST') {
        index.ProvisionedThroughput = {
          ReadCapacityUnits: throughput?.read ?? DEFAULT_READ_CAPACITY,
          WriteCapacityUnits: throughput?.write ?? DEFAULT_WRITE_CAPACITY,
        }
      }

      if (indexMetadata.nonKeyAttributes != null && indexMetadata.nonKeyAttributes.length > 0) {
        if (indexMetadata.projection !== 'INCLUDE') {
          throw new SchemaError(`Invalid configuration for GlobalSecondaryIndex ${schema.name}/${indexMetadata.name}. nonKeyAttributes can only be used with projection INCLUDE.`)
        }

        index.Projection!.NonKeyAttributes = indexMetadata.nonKeyAttributes
      }

      return index
    })
  }

  if (forCloudFormation && schema.timeToLiveAttribute != null) {
    (params as any).TimeToLiveSpecification = {
      AttributeName: schema.timeToLiveAttribute.name,
      Enabled: true,
    }
  }

  params.AttributeDefinitions = uniqBy(params.AttributeDefinitions, (attr) => attr.AttributeName)

  return params
}
