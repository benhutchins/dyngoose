import { expect } from 'chai'
import { TestableTable } from '../../setup-tests.spec'
import { isArray, toArray } from 'lodash'

describe('AttributeType/StringSet', () => {
  let record: TestableTable

  beforeEach(() => {
    record = TestableTable.new()
  })

  describe('setting', () => {
    it('should allow values to be a Set', () => {
      expect(record.testStringSet).eq(null)
      record.testStringSet = new Set<string>(['some value'])
      expect(toArray(record.testStringSet)).deep.eq(['some value'])
    })

    it('should allow values to be an Array', () => {
      expect(record.testStringSet).eq(null)
      record.testStringSet = ['some value'] as any
      expect(toArray(record.testStringSet)).deep.eq(['some value'])
    })
  })

  describe('getting', () => {
    it('should allow values to read as a Set', () => {
      expect(record.testStringSet).eq(null)
      record.testStringSet = new Set<string>(['some value'])
      expect(record.testStringSet).to.be.instanceOf(Set)
    })

    it('should allow values to be an Array', () => {
      expect(record.testStringSetArray).eq(null)
      record.testStringSetArray = ['some value']
      expect(isArray(record.testStringSetArray)).eq(true)
    })
  })
})
