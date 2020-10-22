import { expect } from 'chai'
import { TestableTable } from '../../setup-tests.spec'

describe('AttributeType/Number', () => {
  let record: TestableTable

  beforeEach(() => {
    record = new TestableTable()
  })

  it('should store values as numbers', () => {
    expect(record.testNumber).eq(null)
    record.testNumber = 10
    expect(record.testNumber).eq(10)
    expect(record.get('testNumber')).eq(10)
    expect(record.getAttribute('testNumber')).eq(10)
    expect(record.getAttributeDynamoValue('testNumber')).deep.eq({ N: '10' })
  })

  it('supports BigInt values', () => {
    const int = BigInt('9007199254740991')
    expect(record.testBigInt).eq(null)
    record.testBigInt = int
    expect(record.testBigInt).to.eq(Number(int), 'read from record')
    expect(record.get('testBigInt')).eq(Number(int), 'use .get')
    expect(record.getAttribute('testBigInt')).eq(Number(int), 'use .getAttribute')
    expect(record.getAttributeDynamoValue('testBigInt')).deep.eq({ N: int.toString() }, 'use .getAttributeDynamoValue')
  })

  it('rejects non-number values', () => {
    expect(record.testNumber).eq(null)
    expect(record.testString).eq(null)
    // we do this primarily to ensure typing is enforced for queries
    expect(() => { record.testNumber = 'test' as any as number }).to.throw()
  })
})
