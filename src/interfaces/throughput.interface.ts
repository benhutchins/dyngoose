type IThroughputTargetUtilization = 20
| 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30
| 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40
| 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50
| 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60
| 61 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 | 70
| 71 | 72 | 73 | 74 | 75 | 76 | 77 | 78 | 79 | 80
| 81 | 82 | 83 | 84 | 85 | 86 | 87 | 88 | 89 | 90

export interface IThroughputAutoScalingCapacity {
  // these apply to both read and write
  targetUtilization: IThroughputTargetUtilization // defaults to 70
  minCapacity: number // defaults to 5 units
  maxCapacity: number // defaults to 40000 units
}

interface IStaticThroughput {
  read: number
  write: number
  autoScaling?: void
}

interface IAutoScalingThroughputFields {
  read?: void
  write?: void

  /**
   * Tries to enable auto scaling for this table.
   *
   * Note: You cannot actually create a table with autoscaling enabled by
   * default, so the process requires you to create a provisioned table and then
   * enable autoscaling has to be enabled later.
   *
   * WARNING: Dyngoose DOES NOT automatically enable auto-scaling when using the
   * `Table.createTable` utility! Use the CloudFormation template generator.
   *
   * @see {@link https://aws.amazon.com/blogs/database/how-to-use-aws-cloudformation-to-configure-auto-scaling-for-amazon-dynamodb-tables-and-indexes/}
   */
  autoScaling: true | IThroughputAutoScalingCapacity | { read: IThroughputAutoScalingCapacity, write: IThroughputAutoScalingCapacity }
}

export type IThroughput = IStaticThroughput | IAutoScalingThroughputFields
