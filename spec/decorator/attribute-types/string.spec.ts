import { expect } from 'chai'

import { TestableTable } from '../../setup-tests.spec'

describe('AttributeType/String', () => {
  let record: TestableTable

  beforeEach(() => {
    record = TestableTable.new()
  })

  it('should store values as strings', () => {
    expect(record.testString).eq(null)
    record.testString = 'some value'
    expect(record.testString).eq('some value')
    expect(record.get('testString')).eq('some value')
    expect(record.getAttribute('testString')).eq('some value')
    expect(record.getAttributeDynamoValue('testString')).deep.eq({ S: 'some value' })
  })

  it('rejects non-string values', () => {
    expect(record.testString).eq(null)
    // we do this primarily to ensure typing is enforced for queries
    expect(() => { record.testString = 10 as any as string }).to.throw()
  })

  describe('default values', () => {
    it('supports default values', () => {
      expect(record.defaultedString).eq('SomeDefault')
    })

    it('ignores default when it has a value from constructor', () => {
      record = TestableTable.new({ defaultedString: '123' })
      expect(record.defaultedString).eq('123')
    })

    it('ignores default when it has a value from DynamoDB', () => {
      record = TestableTable.fromDynamo({ defaultedString: { S: '123' } })
      expect(record.defaultedString).eq('123')
    })
  })

  describe('additional metadata options', () => {
    it('lowercase', () => {
      record.lowercaseString = 'Hello World'
      expect(record.lowercaseString).eq('hello world')
    })

    it('uppercase', () => {
      record.uppercaseString = 'Hello World'
      expect(record.uppercaseString).eq('HELLO WORLD')
    })

    it('trim', () => {
      record.trimmedString = ' what '
      expect(record.trimmedString).eq('what')
    })
  })
})
