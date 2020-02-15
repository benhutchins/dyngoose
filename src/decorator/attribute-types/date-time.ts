import { DynamoDB } from 'aws-sdk'
import * as moment from 'moment'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { IAttributeType } from '../../interfaces/attribute-type.interface'
import { DateTimeAttributeMetadata, DateTimeAttributeValue } from '../../metadata/attribute-types/date-time.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Value = DateTimeAttributeValue
type Metadata = DateTimeAttributeMetadata

export class DateTimeAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.String

  toDynamo(dt: Date) {
    return {
      S: moment.utc(dt).toISOString(),
    }
  }

  fromDynamo(attributeValue: DynamoDB.AttributeValue) {
    return moment.utc(attributeValue.S as string).toDate()
  }

  fromJSON(dt: moment.MomentInput) {
    return moment.utc(dt).toDate()
  }

  toJSON(dt: Value) {
    return moment.utc(dt).toISOString()
  }
}
