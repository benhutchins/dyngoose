import { expect } from 'chai'
import { TestableTable } from '../../setup-tests.spec'

describe('AttributeType/Date', () => {
  let record: TestableTable
  let now: Date

  beforeEach(() => {
    now = new Date()
    record = TestableTable.new()
  })

  describe(':nowOnCreate', () => {
    it('should set date to now when creating a record', async () => {
      record.id = 40
      record.title = 'date nowOnCreate test'
      await record.save()

      expect(record.createdAt).to.be.a('date')
      expect(record.toJSON().createdAt).to.be.a('string')
      expect(record.createdAt).to.be.at.least(now)
      expect(record.getAttributeDynamoValue('createdAt')).to.deep.eq({
        S: record.createdAt.toISOString(),
      })
    })
  })

  describe(':nowOnUpdate', () => {
    it('should set date to now when updating a record', async () => {
      record.id = 41
      record.title = 'date nowOnUpdate test'
      await record.save()

      expect(record.updatedAt).to.be.a('date')

      // wait 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const later = new Date()
      expect(record.updatedAt).to.be.within(now, later)
      expect(record.updatedAt).to.be.below(later)

      // wait 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // save again
      await record.save({ force: true }) // using force save so it saves, ignoring the fact there are no changes

      expect(record.updatedAt).to.be.a('date')
      expect(record.updatedAt).to.be.at.least(later)
      expect(record.updatedAt).to.be.at.within(later, new Date())

      expect(record.getAttributeDynamoValue('createdAt')).to.deep.eq({
        S: record.createdAt.toISOString(),
      })
    })

    it('should set date to now when updating a partial record', async () => {
      record.id = 42
      record.title = 'date nowOnUpdate test 1'

      expect(record.id).to.eq(42)
      expect(record.updatedAt).to.be.a('date')

      await record.save()
      const updatedAtBeforeSave = record.updatedAt

      // wait 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const beforeTime = new Date()
      record = TestableTable.primaryKey
        .fromKey({ id: 42, title: 'date nowOnUpdate test 1' })
        .setValues({ testString: 'make some magic' })
      await record.save({ force: true })
      const afterTime = new Date()

      expect(record.updatedAt).to.be.a('date')
      expect(record.updatedAt).to.not.be.eq(updatedAtBeforeSave)
      expect(record.updatedAt).to.be.within(beforeTime, afterTime)
    })
  })

  describe(':unixTimestamp', () => {
    it('should store a date as a unix timestamp', async () => {
      const now = new Date()
      record.unixTimestamp = now

      expect(record.unixTimestamp).to.be.a('date')
      expect(record.toJSON().unixTimestamp).to.be.a('number')

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
      expect(record.toJSON().msTimestamp).to.be.a('number')
      expect(record.msTimestamp.valueOf()).to.eq(now.valueOf())
      expect(record.getAttributeDynamoValue('msTimestamp')).to.deep.eq({
        N: now.valueOf().toString(),
      })
    })
  })

  describe('Passing strings', () => {
    it('should allow strings to be passed with date only', async () => {
      (record as any).dateOnly = '2021-02-24'

      expect(record.dateOnly).to.be.a('date')
      expect(record.dateOnly.toISOString()).to.eq('2021-02-24T00:00:00.000Z')
    })

    it('should allow strings to be passed with date and time', async () => {
      (record as any).fullDate = '2018-01-25T23:55:39.000Z'

      expect(record.fullDate).to.be.a('date')
      expect(record.fullDate.toISOString()).to.eq('2018-01-25T23:55:39.000Z')
    })
  })

  describe('.fromJSON', () => {
    it('should ignore empty values', async () => {
      record.fromJSON({
        dateOnly: '',
        fullDate: '',
      })

      expect(record.dateOnly).to.be.eq(null)
      expect(record.fullDate).to.be.eq(null)
    })

    it('should accept string values', async () => {
      record.fromJSON({
        dateOnly: '2021-02-24',
        fullDate: '2018-01-25T23:55:39.000Z',
      })

      expect(record.dateOnly).to.be.a('date')
      expect(record.dateOnly.toISOString()).to.eq('2021-02-24T00:00:00.000Z')

      expect(record.fullDate).to.be.a('date')
      expect(record.fullDate.toISOString()).to.eq('2018-01-25T23:55:39.000Z')
    })
  })
})
