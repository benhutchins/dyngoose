import { expect } from 'chai'
import { TestableTable } from '../setup-tests.spec'
import { buildProjectionExpression } from './projection-expression'

describe('Query/ProjectionExpression', () => {
  describe('buildProjectionExpression', () => {
    it('transformed reserved keywords', () => {
      const expression = buildProjectionExpression(TestableTable, ['id', 'status'])

      expect(expression.ProjectionExpression).to.eq('id,#p0')
      expect(expression.ExpressionAttributeNames).to.deep.eq({
        '#p0': 'status',
      })
    })
  })
})
