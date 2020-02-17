import { expect } from 'chai'
import { TestableTable } from '../../setup-tests.spec'

describe('AttributeType/Date', () => {
  let record: TestableTable

  beforeEach(() => {
    record = new TestableTable()
  })

  describe(':nowOnCreate', () => {
    it('should set date to now when creating a record', async () => {
      const now = new Date()
      record.id = 40
      record.title = 'date nowOnCreate test'
      await record.save()

      expect(record.createdAt).to.be.a('date')
      expect(record.createdAt).to.be.at.least(now)
      expect(record.getAttributeDynamoValue('createdAt')).to.deep.eq({
        S: record.createdAt.toISOString(),
      })
    })
  })

  describe(':nowOnUpdate', () => {
    it('should set date to now when updating a record', async () => {
      const start = new Date()
      record.id = 41
      record.title = 'date nowOnUpdate test'
      await record.save()

      expect(record.updatedAt).to.be.a('date')

      // wait 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const now = new Date()
      expect(record.updatedAt).to.be.within(start, now)
      expect(record.updatedAt).to.be.below(now)

      // wait 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // save again
      await record.forceSave() // using force save so it saves, ignoring the fact there are no changes

      expect(record.updatedAt).to.be.a('date')
      expect(record.updatedAt).to.be.at.least(now)
      expect(record.updatedAt).to.be.at.within(now, new Date())

      expect(record.getAttributeDynamoValue('createdAt')).to.deep.eq({
        S: record.createdAt.toISOString(),
      })
    })
  })
})
