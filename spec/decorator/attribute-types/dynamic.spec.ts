import { expect } from 'chai'

import { TestableTable } from '../../setup-tests.spec'

describe('AttributeType/Dynamic', () => {
  let record: TestableTable

  beforeEach(() => {
    record = TestableTable.new()
  })

  it('should store values based on the object type', () => {
    expect(record.dynamic).eq(null)
    record.dynamic = 'some value'
    expect(record.dynamic).eq('some value')
    expect(record.getAttributeDynamoValue('dynamic')).to.deep.eq({ S: 'some value' })
    record.dynamic = 150
    expect(record.dynamic).eq(150)
    expect(record.getAttributeDynamoValue('dynamic')).to.deep.eq({ N: '150' })
  })

  it('should support dynamic maps', () => {
    expect(record.dynamic).eq(null)
    record.dynamic = { a: 'A', b: 'B' } as any
    expect(record.dynamic).deep.eq({ a: 'A', b: 'B' })
    expect(record.getAttributeDynamoValue('dynamic')).to.deep.eq({ M: { a: { S: 'A' }, b: { S: 'B' } } })
  })

  it('should support dynamic lists', () => {
    expect(record.dynamic).eq(null)
    record.dynamic = [1, 2, 3] as any
    expect(record.dynamic).deep.eq([1, 2, 3])
    expect(record.getAttributeDynamoValue('dynamic')).to.deep.eq({ L: [{ N: '1' }, { N: '2' }, { N: '3' }] })
  })
})
