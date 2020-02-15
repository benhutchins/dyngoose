import { DynamoDB } from 'aws-sdk'
import * as moment from 'moment'
import { DynamoAttributeType } from '../../dynamo-attribute-types'
import { IAttributeType } from '../../interfaces/attribute-type.interface'
import { DateOnlyAttributeValue } from '../../metadata/attribute-types/date-only.metadata'
import { DateTimeAttributeMetadata } from '../../metadata/attribute-types/date-time.metadata'
import { AttributeType } from '../../tables/attribute-type'

type Value = DateOnlyAttributeValue
type Metadata = DateTimeAttributeMetadata

export class DateOnlyAttributeType extends AttributeType<Value, Metadata> implements IAttributeType<Value> {
  type = DynamoAttributeType.String

  toDynamo(dt: Date) {
    return {
      S: moment.utc(dt).format('YYYY-MM-DD'),
    }
  }

  fromDynamo(attributeValue: DynamoDB.AttributeValue) {
    return moment.utc(attributeValue.S as string).toDate()
  }

  fromJSON(dt: moment.MomentInput) {
    return moment.utc(dt).toDate()
  }

  toJSON(dt: Value) {
    return moment.utc(dt).format('YYYY-MM-DD')
  }
}
