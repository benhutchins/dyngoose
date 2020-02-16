import * as moment from 'moment'
import { AttributeMetadata } from '../attribute'

export interface DateAttributeMetadata extends AttributeMetadata<Date> {
  /**
   * Specify the format you want Moment to store values in, by default
   * it will use moment.ISO_8601 format. You can also use some of the
   * other options to change the format, such as:
   *
   * * dateOnly will use YYYY-MM-DD format
   * * timestamp will store values as Unix timestamps
   */
  format?: string | moment.MomentBuiltinFormat

  /**
  * When true, stores only the date part of the Date value in an
  * ISO 8601 compliant format of YYYY-MM-DD.
  */
  dateOnly?: boolean

  /**
  * When true, stores value as a Unix timestamp values.
  */
  timestamp?: boolean
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
