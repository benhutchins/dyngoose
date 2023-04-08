import { App, Stack } from 'aws-cdk-lib'
import { expect } from 'chai'
import { createCDKTable } from './cdk'
import { TestableTable } from '../setup-tests.spec'

describe('utils/cdk', () => {
  describe('createCDKTable', () => {
    it('creates a CDK table', () => {
      const app = new App()
      const stack = new Stack(app)
      const table = createCDKTable(stack, TestableTable.schema)
      expect(table.tableName).to.contain('TOKEN.')
    })
  })
})
