import { DynamoDB } from 'aws-sdk'
import { IThroughput } from '../interfaces'

export interface TableMetadata {
  name?: string

  /**
   * You can optionally specify the connection for a table
   */
  readonly connection?: DynamoDB

  /**
   * Define your desired throughput read and write capacity units.
   *
   * You can also specify you desire auto scaling, and when generating a CloudFormation
   * template for this table the necessary resources will be added.
   */
  readonly throughput?: IThroughput | number

  /**
   * Whether this table should be encrypted at rest.
   */
  readonly encrypted?: boolean

  /**
   * Whether this table should have a stream enabled.
   */
  readonly stream?: boolean | DynamoDB.StreamSpecification
}
