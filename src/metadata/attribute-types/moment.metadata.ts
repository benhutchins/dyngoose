import * as moment from 'moment'
import { AttributeMetadata } from '../attribute'

export type MomentAttributeValue = moment.Moment

export interface MomentAttributeMetadata extends AttributeMetadata<MomentAttributeValue> {
}
