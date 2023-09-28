import { expect, should } from 'chai'
import { Table } from '../table'
import { PrimaryKey } from './primary-key'

import {
  Attribute as AttributeDecorator,
  PrimaryKey as PrimaryKeyDecorator,
  Table as TableDecorator,
} from '../decorator'

describe('Query/PrimaryKey', () => {
  @TableDecorator({ name: 'QueryPrimaryKeyCardTable', backup: false })
  class Card extends Table {
    @PrimaryKeyDecorator('id', 'title')
    public static readonly primaryKey: PrimaryKey<Card, number, string>

    @AttributeDecorator.Number()
    public id: number

    @AttributeDecorator.String()
    public title: string

    @AttributeDecorator.Number()
    public count: number
  }

  @TableDecorator({ name: 'QueryPrimaryKeyTableWithDateRange', backup: false })
  class TableWithDateRange extends Table {
    @PrimaryKeyDecorator('id', 'date')
    public static readonly primaryKey: PrimaryKey<TableWithDateRange, number, Date>

    @AttributeDecorator.Number()
    public id: number

    @AttributeDecorator.Date()
    public date: Date
  }

  let primaryKey: PrimaryKey<Card, number, string>

  before(async () => {
    await TableWithDateRange.createTable()
  })

  after(async () => {
    await TableWithDateRange.deleteTable()
  })

  beforeEach(async () => {
    await Card.createTable()
    primaryKey = Card.primaryKey
  })

  afterEach(async () => {
    await Card.deleteTable()
  })

  describe('#delete', () => {
    it('should delete item if exist', async () => {
      await Card.new({ id: 10, title: 'abc' }).save()

      await primaryKey.delete(10, 'abc')

      expect(await primaryKey.get(10, 'abc')).to.eq(undefined)
    })
  })

  describe('#get', () => {
    it('should find nothing when nothing exists', async () => {
      let item = await primaryKey.get({ id: 10, title: 'abc' })
      expect(item).to.eq(undefined)

      item = await primaryKey.get(10, 'abc')
      expect(item).to.eq(undefined)
    })

    it('should not find item using a query filter object when aborted', async () => {
      const abortController = new AbortController()

      await Card.new({ id: 10, title: 'abc' }).save()
      abortController.abort()

      let exception
      try {
        await primaryKey.get({ id: 10, title: 'abc' }, undefined, { abortSignal: abortController.signal })
      } catch (ex) {
        exception = ex
      }

      should().exist(exception)
    })

    it('should find item using a query filter object', async () => {
      await Card.new({ id: 10, title: 'abc' }).save()
      const item = await primaryKey.get({ id: 10, title: 'abc' })
      expect(item).to.be.instanceof(Card)
      if (item != null) {
        expect(item.id).to.eq(10)
        expect(item.title).to.eq('abc')
      }
    })

    it('should find item using hash and range arguments', async () => {
      await Card.new({ id: 10, title: 'abc' }).save()
      const item = await primaryKey.get(10, 'abc')
      expect(item).to.be.instanceof(Card)
      if (item != null) {
        expect(item.id).to.eq(10)
        expect(item.title).to.eq('abc')
      }
    })

    it('should not find item using hash and range arguments when aborted', async () => {
      const abortController = new AbortController()
      await Card.new({ id: 10, title: 'abc' }).save()

      abortController.abort()

      let exception
      try {
        await primaryKey.get(10, 'abc', undefined, { abortSignal: abortController.signal })
      } catch (ex) {
        exception = ex
      }

      should().exist(exception)
    })

    it('should allow date type to be the range', async () => {
      const now = new Date()
      await TableWithDateRange.new({ id: 1, date: now }).save()
      const item = await TableWithDateRange.primaryKey.get(1, now)
      expect(item).to.be.instanceof(TableWithDateRange)
      if (item != null) {
        expect(item.id).to.eq(1)
        expect(item.date.toISOString()).to.eq(now.toISOString())
      }
    })
  })

  describe('#batchGet', () => {
    it('should find items', async () => {
      await Card.new({ id: 10, title: 'abc' }).save()
      await Card.new({ id: 11, title: 'abc' }).save()
      await Card.new({ id: 12, title: 'abc' }).save()

      const items1 = await primaryKey.batchGet([
        [10, 'abc'],
        [11, 'abc'],
      ])
      expect(items1.length).to.eq(2)
      expect(items1[0].id).to.eq(10)
      expect(items1[1].id).to.eq(11)

      const items2 = await primaryKey.batchGet([
        [10, 'abc'],
        [10000, 'asdgasdgs'],
        [11, 'abc'],
      ])
      expect(items2.length).to.eq(2)
      expect(items2[0].id).to.eq(10)
      expect(items2[0].title).to.eq('abc')
      expect(items2[1].id).to.eq(11)
      expect(items2[1].title).to.eq('abc')
    })
  })

  describe('#query', () => {
    it('should find items', async () => {
      await Card.new({ id: 10, title: 'abc' }).save()
      await Card.new({ id: 10, title: 'abd' }).save()
      await Card.new({ id: 10, title: 'aba' }).save()

      let res = await primaryKey.query({
        id: 10,
        title: ['between', 'abc', 'abf'],
      })

      expect(res.records.length).to.eq(2)
      expect(res.records[0].title).to.eq('abc')
      expect(res.records[1].title).to.eq('abd')

      res = await primaryKey.query({
        id: 10,
        title: ['between', 'abc', 'abf'],
      }, {
        rangeOrder: 'DESC',
      })

      expect(res.records.length).to.eq(2)
      expect(res.records[0].title).to.eq('abd')
      expect(res.records[1].title).to.eq('abc')
    })

    it('should return an empty array when no results match', async () => {
      const res = await primaryKey.query({
        id: 420,
      })

      expect(res[0]).to.not.eq(null)
      expect(res.length).to.eq(0)
      expect(res.count).to.eq(0)
      expect(res.records.length).to.eq(0)
      expect(res.map(i => i)[0]).to.eq(undefined)
    })
  })

  describe('#scan', () => {
    it('should find items', async () => {
      await Card.new({ id: 10, title: 'abc' }).save()
      await Card.new({ id: 10, title: 'abd' }).save()
      await Card.new({ id: 10, title: 'aba' }).save()

      const res = await primaryKey.scan(null, {
        limit: 2,
      })

      expect(res.records.length).to.eq(2)
      // Ordered by range key since it's "scan"
      expect(res.records[0].title).to.eq('aba')
      expect(res.records[1].title).to.eq('abc')
    })

    it('should not find items when aborted', async () => {
      const abortController = new AbortController()

      await Card.new({ id: 10, title: 'abc' }).save()
      await Card.new({ id: 10, title: 'abd' }).save()
      await Card.new({ id: 10, title: 'aba' }).save()
      abortController.abort()

      let exception
      try {
        await primaryKey.scan(null, {
          limit: 2,
        }, { abortSignal: abortController.signal })
      } catch (ex) {
        exception = ex
      }

      should().exist(exception)
    })
  })

  describe('#update', () => {
    it('should be able to update items', async () => {
      await primaryKey.update({
        hash: 10,
        range: 'abc',
        changes: {
          count: 1,
        },
      })

      let card = await primaryKey.get(10, 'abc')
      expect(card).to.be.instanceOf(Card)
      if (card != null) {
        expect(card.count).to.eq(1)
      }

      await primaryKey.update({
        hash: 10,
        range: 'abc',
        changes: {
          count: 2,
        },
      })

      card = await primaryKey.get(10, 'abc')
      expect(card).to.be.instanceOf(Card)
      if (card != null) {
        expect(card.count).to.eq(2)
      }
    })
  })
})
