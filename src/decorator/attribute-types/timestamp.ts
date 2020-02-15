import { DynamoDB } from 'aws-sdk'
import * as moment from 'moment'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { IAttributeType } from '../../interfaces/attribute-type.interface'
import { TimestampAttributeMetadata } from '../../metadata/attribute-types/timestamp.metadata'
import { AttributeType } from '../../tables/attribute-type'
import { numberToString, stringToNumber } from './utils'

type Value = number
type Metadata = TimestampAttributeMetadata

export class TimestampAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.Number

    /**
   * if ((attribute.options as any).timeToLive) {
      if (this.timeToLiveAttribute) {
        throw new Error(`Table ${this.name} has two timeToLive attributes defined`)
      } else {
        this.timeToLiveAttribute = attribute
      }
    }
  */

  getDefault() {
    if (this.metadata.nowOnCreate) {
      return moment().utc().unix()
    }

    return null
  }

  toDynamo(value: Value) {
    if (this.metadata.nowOnUpdate) {
      value = moment().utc().unix()
    }

    return {
      N: numberToString(value),
    }
  }

  fromDynamo(value: DynamoDB.AttributeValue) {
    return stringToNumber(value.N as string)
  }
}
