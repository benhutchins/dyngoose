import { expect } from 'chai'
import { TestableTable } from '../../setup-tests.spec'

describe('AttributeType/NumberSet', () => {
  let record: TestableTable

  beforeEach(() => {
    record = new TestableTable()
  })

  it('should store values as an array of numbers', () => {
    expect(record.testNumberSet).eq(null)
    record.testNumberSet = new Set([10, 100])
    expect(Array.from(record.testNumberSet)).deep.eq([10, 100])
    expect(Array.from(record.get('testNumberSet')!)).deep.eq([10, 100])
    expect(record.getAttributeDynamoValue('testNumberSet')).deep.eq({ NS: ['10', '100'] })
  })

  it('supports BigInt values', () => {
    const int = BigInt('9007199254740991')
    expect(record.testNumberSet).eq(null)
    record.testNumberSet = new Set([int])
    expect(Array.from(record.testNumberSet)).to.deep.eq([Number(int)], 'read from record')
    expect(Array.from(record.get('testNumberSet')!)).deep.eq([Number(int)], 'use .get')
    expect(Array.from(record.getAttribute('testNumberSet')!)).deep.eq([Number(int)], 'use .getAttribute')
    expect(record.getAttributeDynamoValue('testNumberSet')).deep.eq({ NS: [int.toString()] }, 'use .getAttributeDynamoValue')
  })

  it('rejects non-number values', () => {
    expect(record.testNumberSet).eq(null)

    // we do this primarily to ensure typing is enforced for queries
    expect(() => {
      record.testNumberSet = ['test'] as any
    }).to.throw()
  })
})
