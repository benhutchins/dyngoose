import { DynamoDB } from 'aws-sdk'
import { AttributeMetadata } from '../attribute'

type Type = DynamoDB.BinaryAttributeValue

export interface BinaryAttributeMetadata extends AttributeMetadata<Type> {
}
