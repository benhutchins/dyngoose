import * as AWS from 'aws-sdk'
import { expect } from 'chai'
import { DynamoDBConnection } from './dynamodb-connection'

describe(DynamoDBConnection.name, () => {
  describe('#constructor', () => {
    it('should work', () => {
      const conn = new DynamoDBConnection({ endpoint: undefined, enableAWSXray: false })
      expect(conn).to.be.instanceof(DynamoDBConnection)
    })
  })

  describe('#client', () => {
    it('should return client', () => {
      const conn = new DynamoDBConnection({ endpoint: undefined, enableAWSXray: false })
      expect(conn.client).to.be.instanceof(AWS.DynamoDB)
    })
  })
})
