import { expect } from 'chai'
import { TestableTable } from '../../setup-tests.spec'
import { isArray, toArray } from 'lodash'

describe('AttributeType/StringSet', () => {
  let record: TestableTable

  beforeEach(() => {
    record = TestableTable.new()
  })

  afterEach(async () => {
    if (!record.isNew()) {
      await record.delete()
    }
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

  describe('update operators', () => {
    it('should support update operators add', async () => {
      record.id = 10
      record.title = 'add to set'
      record.generic = 'something'
      expect(record.testStringSet).eq(null)
      record.testStringSet = new Set<string>(['some value'])
      await record.save()

      record.set('testStringSet', record.testStringSet.add('some new value'), {
        operator: 'add',
      })

      const updateInput = TestableTable.documentClient.getUpdateInput(record)
      expect(updateInput.UpdateExpression).eq('SET #UA1 = :u1 ADD #UA0 :u0')
      expect(updateInput.ExpressionAttributeValues![':u0'].SS).deep.eq(['some value', 'some new value'])

      await record.save()

      const reloaded = await TestableTable.primaryKey.get({ id: 10, title: 'add to set' })
      expect(toArray(reloaded?.testStringSet)).to.deep.eq(['some new value', 'some value'])
    })
  })
})
