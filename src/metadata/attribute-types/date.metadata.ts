import { type AttributeMetadata } from '../attribute'

export interface DateAttributeMetadata extends AttributeMetadata<Date> {
  /**
   * When true, stores only the date part of the Date value in an
   * ISO 8601 compliant format of YYYY-MM-DD.
   */
  dateOnly?: boolean

  /**
   * When true, stores value as a Unix timestamp values.
   */
  unixTimestamp?: boolean

  /**
   * When true, value is stored as a timestamp consistent with JavaScript's Date.now()
   * style of the number of milliseconds elapsed since 1 January 1970 00:00:00 UTC.
   *
   * This is especially useful if you area using the timestamp as part of a RANGE key
   * on a Table's PrimaryKey and you need to ensure the timestamps are unique.
   */
  millisecondTimestamp?: boolean

  /**
   * When true, this attribute will be marked as the table's Time-To-Live (TTL) attribute.
   *
   * TTLs must be stored as unix timestamps, and Dyngoose will internally force the saved value
   * into a timestamp (see the unixTimestamp). DynamoDB will automatically delete this record
   * when when the timestamp is reached.
   *
   * @see {@link https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html}
   */
  timeToLive?: boolean

  /**
   * When true, the value will be automatically set the current date & time
   * when a new record is created.
   */
  nowOnCreate?: boolean

  /**
   * When true, the value will be automatically updated to the current
   * date & time when a record is created or updated.
   */
  nowOnUpdate?: boolean
}
