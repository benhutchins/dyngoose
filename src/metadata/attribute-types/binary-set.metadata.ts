import { DynamoDB } from 'aws-sdk'
import { AttributeMetadata } from '../attribute'

type Type = DynamoDB.BinarySetAttributeValue

export interface BinarySetAttributeMetadata extends AttributeMetadata<Type> {
}
