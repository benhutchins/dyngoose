type IThroughputTargetUtilization = 20
| 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30
| 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40
| 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50
| 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60
| 61 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 | 70
| 71 | 72 | 73 | 74 | 75 | 76 | 77 | 78 | 79 | 80
| 81 | 82 | 83 | 84 | 85 | 86 | 87 | 88 | 89 | 90

export interface IThroughputAutoScalingCapacity {
  /**
   * Target utilization.
   *
   * @default {DEFAULT_AUTOSCALING_TARGET_UTILIZATION}
   */
  targetUtilization?: IThroughputTargetUtilization

  /**
   * Minimum capacity units
   *
   * @default {DEFAULT_AUTOSCALING_MIN_CAPACITY}
   */
  minCapacity?: number

  /**
   * Maximum capacity units
   *
   * @default {DEFAULT_AUTOSCALING_MAX_CAPACITY}
   */
  maxCapacity?: number
}

interface IStaticThroughput {
  read: number
  write: number
  autoScaling?: undefined
}

interface IAutoScalingThroughputFields {
  read?: undefined
  write?: undefined

  /**
   * Enable auto scaling for this table.
   *
   * Note: You cannot actually create a table with autoscaling enabled by
   * default, so the process requires you to create a provisioned table and then
   * enable autoscaling has to be enabled later.
   *
   * WARNING: This only works when using CDK generation. Dyngoose DOES NOT
   * configure auto-scaling when using the `Table.createTable` utility!
   *
   * @see {@link https://aws.amazon.com/blogs/database/how-to-use-aws-cloudformation-to-configure-auto-scaling-for-amazon-dynamodb-tables-and-indexes/}
   */
  autoScaling: true | IThroughputAutoScalingCapacity | { read: IThroughputAutoScalingCapacity, write: IThroughputAutoScalingCapacity }
}

export type IThroughput = IStaticThroughput | IAutoScalingThroughputFields
