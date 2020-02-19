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

  describe(':unixTimestamp', () => {
    it('should store a date as a unix timestamp', async () => {
      const now = new Date()
      record.unixTimestamp = now

      expect(record.unixTimestamp).to.be.a('date')

      // the unixTimestamp should have ben converted to a unix timestamp, so it should be slightly different from `now`
      expect(record.unixTimestamp.valueOf()).to.not.eq(now.valueOf())

      // the js timestamp to unix timestamp conversion should work
      expect(record.unixTimestamp.valueOf()).to.eq(Math.floor(now.valueOf() / 1000) * 1000)

      expect(record.getAttributeDynamoValue('unixTimestamp')).to.deep.eq({
        N: Math.floor(now.valueOf() / 1000).toString(),
      })
    })
  })

  describe(':millisecondTimestamp', () => {
    it('should store a date as a millisecond timestamp', async () => {
      const now = new Date()
      record.msTimestamp = now

      expect(record.msTimestamp).to.be.a('date')
      expect(record.msTimestamp.valueOf()).to.eq(now.valueOf())
      expect(record.getAttributeDynamoValue('msTimestamp')).to.deep.eq({
        N: now.valueOf().toString(),
      })
    })
  })
})
