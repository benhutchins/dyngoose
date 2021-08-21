import { expect, should } from 'chai'
import * as Decorator from '../decorator'
import { QueryError } from '../errors'
import { Table } from '../table'
import * as Query from './index'

@Decorator.Table({ name: 'QueryGlobalSecondaryIndexCardTable' })
class Card extends Table {
  @Decorator.PrimaryKey('id', 'title')
  public static readonly primaryKey: Query.PrimaryKey<Card, number, string>

  @Decorator.GlobalSecondaryIndex({ hashKey: 'title' })
  public static readonly hashTitleIndex: Query.GlobalSecondaryIndex<Card>

  @Decorator.GlobalSecondaryIndex({ hashKey: 'title', rangeKey: 'id' })
  public static readonly fullTitleIndex: Query.GlobalSecondaryIndex<Card>

  @Decorator.GlobalSecondaryIndex({ hashKey: 'id', rangeKey: 'title' })
  public static readonly filterableTitleIndex: Query.GlobalSecondaryIndex<Card>

  @Decorator.GlobalSecondaryIndex({
    hashKey: 'id',
    projection: 'INCLUDE',
    nonKeyAttributes: ['title'],
  })
  public static readonly includeTestIndex: Query.GlobalSecondaryIndex<Card>

  @Decorator.Attribute.Number()
  public id: number

  @Decorator.Attribute.String()
  public title: string

  @Decorator.Attribute.Number()
  public count: number

  customMethod(): number {
    return 1
  }
}

describe('Query/GlobalSecondaryIndex', () => {
  beforeEach(async () => {
    await Card.createTable()
  })

  afterEach(async () => {
    await Card.deleteTable()
  })

  describe('hash only index', () => {
    describe('#get', () => {
      it('should throw error when no range key is specified', async () => {
        let exception
        try {
          await Card.filterableTitleIndex.get({ id: 10 })
        } catch (ex) {
          exception = ex
        }

        should().exist(exception)
      })

      it('should find item', async () => {
        await Card.new({ id: 10, title: 'abc', count: 1 }).save()

        // this .get() will perform a query with a limit of 1,
        // so it will get the first matching record
        const card = await Card.filterableTitleIndex.get({ id: 10, title: 'abc' })

        should().exist(card)

        if (card != null) {
          expect(card.id).to.eq(10)
          expect(card.title).to.eq('abc')
          expect(card.count).to.eq(1)
        }
      })
    })

    describe('#query', () => {
      it('should find items', async () => {
        await Card.new({ id: 10, title: 'abc' }).save()
        await Card.new({ id: 11, title: 'abd' }).save()
        await Card.new({ id: 12, title: 'abd' }).save()

        const res = await Card.hashTitleIndex.query({ title: 'abd' })
        expect(res.records.length).to.eq(2)
        expect(res.records[0].id).to.eq(12)
        expect(res.records[1].id).to.eq(11)
      })

      it('should return an empty array when no items match', async () => {
        const res = await Card.hashTitleIndex.query({ title: '404' })
        expect(res[0]).to.not.eq(null)
        expect(res.records.length).to.eq(0)
        expect(res.length).to.eq(0)
        expect(res.count).to.eq(0)
        expect(res.map(i => i)[0]).to.eq(undefined)

        for (const card of res.records) {
          expect(card).to.eq('does not exist')
        }

        for (const card of res) {
          expect(card).to.eq('does not exist')
        }
      })

      it('should complain when HASH key is not provided', async () => {
        await Card.hashTitleIndex.query({ id: 10 }).then(
          () => {
            expect(true).to.be.eq('false')
          },
          (err) => {
            expect(err).to.be.instanceOf(QueryError)
            expect(err.message).to.contain('Cannot perform')
          },
        )
      })

      it('should complain when HASH key attempts to use unsupported operator', async () => {
        await Card.hashTitleIndex.query({ title: ['<>', 'abd'] }).then(
          () => {
            expect(true).to.be.eq('false')
          },
          (err) => {
            expect(err).to.be.instanceOf(QueryError)
            expect(err.message).to.contain('DynamoDB only supports')
          },
        )
      })

      it('should allow use of query operators for RANGE', async () => {
        await Card.new({ id: 10, title: 'prefix/abc' }).save()
        await Card.new({ id: 10, title: 'prefix/123' }).save()
        await Card.new({ id: 10, title: 'prefix/xyz' }).save()

        const res = await Card.filterableTitleIndex.query({ id: 10, title: ['beginsWith', 'prefix/'] })
        expect(res.records.length).to.eq(3)
        expect(res.records[0].id).to.eq(10)
        expect(res.records[1].id).to.eq(10)
        expect(res.records[2].id).to.eq(10)
      })

      it('should complain when using unsupported query operators for RANGE', async () => {
        await Card.filterableTitleIndex.query({ id: 10, title: ['contains', 'prefix/'] }).then(
          () => {
            expect(true).to.be.eq('false')
          },
          (err) => {
            expect(err).to.be.instanceOf(QueryError)
            expect(err.message).to.contain('Cannot use')
          },
        )
      })
    })

    describe('#scan', () => {
      const cardIds = [111, 222, 333, 444, 555]

      beforeEach(async () => {
        for (const cardId of cardIds) {
          await Card.new({ id: cardId, title: cardId.toString() }).save()
        }
      })

      it('should return results', async () => {
        const res1 = await Card.hashTitleIndex.scan()
        const res2 = await Card.hashTitleIndex.scan(null, { limit: 2 })
        const res3 = await Card.hashTitleIndex.scan(null, { limit: 2, exclusiveStartKey: res2.lastEvaluatedKey })

        expect(res1.records.map((r) => r.id)).to.have.all.members(cardIds)
        expect(cardIds).to.include.members(res2.records.map((r) => r.id))
        expect(cardIds).to.include.members(res3.records.map((r) => r.id))
      })
    })
  })

  describe('hash and range index', () => {
    describe('#query', () => {
      it('should find items', async () => {
        await Card.new({ id: 10, title: 'abc' }).save()
        await Card.new({ id: 11, title: 'abd' }).save()
        await Card.new({ id: 12, title: 'abd' }).save()
        await Card.new({ id: 13, title: 'abd' }).save()

        const res = await Card.fullTitleIndex.query({
          title: 'abd',
          id: ['>=', 12],
        }, {
          rangeOrder: 'DESC',
        })
        expect(res.records.length).to.eq(2)

        expect(res.records[0].id).to.eq(13)
        expect(res.records[1].id).to.eq(12)
      })
    })

    describe('#scan', () => {
      const cardIds = [111, 222, 333, 444, 555]

      beforeEach(async () => {
        for (const cardId of cardIds) {
          await Card.new({ id: cardId, title: cardId.toString() }).save()
        }
      })

      it('should support filters', async () => {
        const search = await Card.fullTitleIndex.scan({
          id: ['includes', cardIds],
        })

        expect(search.records.map((r) => r.id)).to.have.all.members(cardIds)
      })

      it('should work without filters', async () => {
        const res1 = await Card.fullTitleIndex.scan()
        const res2 = await Card.fullTitleIndex.scan(null, { limit: 2 })
        const res3 = await Card.fullTitleIndex.scan(null, { limit: 2, exclusiveStartKey: res2.lastEvaluatedKey })

        expect(res1.records.map((r) => r.id)).to.have.all.members(cardIds)
        expect(cardIds).to.include.members(res2.records.map((r) => r.id))
        expect(cardIds).to.include.members(res3.records.map((r) => r.id))
      })
    })
  })

  describe('include projection index', () => {
    it('allows you to query and returns the nonKeyAttributes', async () => {
      const newCard = Card.new({ id: 10, title: 'abc' })
      newCard.count = 10
      await newCard.save()

      const card = await Card.includeTestIndex.get({ id: 10 })

      should().exist(card)

      if (card != null) {
        expect(card.id).to.eq(10)
        expect(card.title).to.eq('abc')
        should().not.exist(card.count)
      }
    })
  })
})
