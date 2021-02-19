import { DynamoDB } from 'aws-sdk'
import { IThroughput } from '../interfaces'

export interface TableMetadata {
  /**
   * The name for your table in DynamoDB.
   */
  name: string

  /**
   * Specify a custom name for the table's resource name in the generated CloudFormation
   * template. When not specified, it'll default to using the Table's class name suffixed
   * with 'Table', example:
   *
   *   `class User extends Dyngoose.Table {}` will become `UserTable`
   */
  cloudFormationResourceName?: string

  /**
   * Optional extra data, used for your own logic.
   */
  extra?: any

  /**
   * You can optionally specify the connection for a table.
   *
   * @see {@link https://github.com/benhutchins/dyngoose/blob/master/docs/Connections.md}.
   */
  readonly connection?: DynamoDB

  /**
   * Define your desired throughput read and write capacity units.
   *
   * You can also specify you desire auto scaling, and when generating a CloudFormation
   * template for this table the necessary resources will be added.
   *
   * By default, auto scaling will be enabled if you generate a CloudFormation template.
   * If you create the table via Table.createTable it will be created with read and write
   * of 5 units (which is basically a minimum).
   *
   * Please @see {@link https://github.com/benhutchins/dyngoose/blog/master/docs/Deployment.md} to learn
   * about recommendations for deploying your tables to production.
   *
   * You can also set your table's billingMode to `PAY_PER_REQUEST`, which renders this
   * option meaningless.
   */
  readonly throughput?: IThroughput | number

  /**
   * Define your table's billing mode.
   *
   * Available options are: `PROVISIONED` or `PAY_PER_REQUEST`.
   * Defaults to `PROVISIONED`.
   *
   * The `throughput` option only matters when using `PROVISIONED`.
   */
  readonly billingMode?: 'PROVISIONED' | 'PAY_PER_REQUEST'

  /**
   * Whether this table data should be encrypted at rest.
   *
   * At this time, encryption can only be enabled using the AWS managed and owned keys.
   * There is no support for specifying KMS keys. Please make a ticket on if someone
   * wants to use that. {@link https://github.com/benhutchins/dyngoose/issues}
   */
  readonly encrypted?: boolean

  /**
   * Whether this table should have a stream enabled.
   *
   * Enabling a stream allows you to setup a Lambda function to trigger whenever a
   * record is created or updated.
   *
   * If you set this to true, it enables the stream for 'NEW_AND_OLD_IMAGES'. You
   * can optionally specify a custom stream specification.
   *
   * @see {@link https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html}
   */
  readonly stream?: boolean | DynamoDB.StreamSpecification

  /**
   * Whether this table should be point-in-time recovery enabled.
   *
   * Recommended as part of of AWS Foundational Security Best Practices v1.0.0
   * @see https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards-fsbp-controls.html#fsbp-dynamodb-2
   *
   * Enables Point-in-Time Recovery. With point-in-time recovery, you can restore that
   * table to any point in time during the last 35 days.
   *
   * @see {@link https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html}
   */
  readonly backup?: boolean
}
