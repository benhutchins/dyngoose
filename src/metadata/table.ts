import { DynamoDB } from 'aws-sdk'
import { IThroughput } from '../interfaces'

export interface TableMetadata {
  /**
   * The name for your table in DynamoDB.
   *
   * Defaults to the class name when no name is provided.
   */
  name?: string

  /**
   * You can optionally specify the connection for a table.
   *
   * @see {@link https://github.com/benhutchins/dyngoose/wiki/Connections}.
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
   * Please @see {@link https://github.com/benhutchins/dyngoose/wiki/Deployment} to learn
   * about recommendations for deploying your tables to production.
   */
  readonly throughput?: IThroughput | number

  /**
   * Whether this table data should be encrypted at rest.
   *
   * False by default, although it is recommended you enable it.
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
}
