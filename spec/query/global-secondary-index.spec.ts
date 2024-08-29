import { expect, should } from 'chai'
import * as Dyngoose from 'dyngoose'
import { QueryError } from 'dyngoose/errors'

@Dyngoose.$Table({ name: 'QueryGlobalSecondaryIndexCardTable', backup: false })
class Card extends Dyngoose.Table {
  @Dyngoose.$PrimaryKey('id', 'title')
  public static readonly primaryKey: Dyngoose.Query.PrimaryKey<Card, number, string>

  @Dyngoose.$GlobalSecondaryIndex({ primaryKey: 'title' })
  public static readonly hashTitleIndex: Dyngoose.Query.GlobalSecondaryIndex<Card>

  @Dyngoose.$GlobalSecondaryIndex({ hashKey: 'title', rangeKey: 'id' })
  public static readonly fullTitleIndex: Dyngoose.Query.GlobalSecondaryIndex<Card>

  @Dyngoose.$GlobalSecondaryIndex({ hashKey: 'id', rangeKey: 'title' })
  public static readonly filterableTitleIndex: Dyngoose.Query.GlobalSecondaryIndex<Card>

  @Dyngoose.$GlobalSecondaryIndex({
    hashKey: 'id',
    projection: 'INCLUDE',
    nonKeyAttributes: ['title'],
  })
  public static readonly includeTestIndex: Dyngoose.Query.GlobalSecondaryIndex<Card>

  @Dyngoose.Attribute.Number()
  public id?: number

  @Dyngoose.Attribute.String()
  public title?: string

  @Dyngoose.Attribute.Number()
  public count?: number

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

      it('should not return items when aborted', async () => {
        const abortController = new AbortController()
        await Card.new({ id: 10, title: 'abc' }).save()
        await Card.new({ id: 11, title: 'abd' }).save()
        await Card.new({ id: 12, title: 'abd' }).save()
        abortController.abort()

        let exception
        try {
          await Card.hashTitleIndex.query({ title: 'abd' }, { abortSignal: abortController.signal })
        } catch (ex) {
          exception = ex
        }

        should().exist(exception)
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

      it('should not return results when aborted', async () => {
        const abortController = new AbortController()
        abortController.abort()

        let exception
        try {
          await Card.hashTitleIndex.scan(null, undefined, { abortSignal: abortController.signal })
        } catch (ex) {
          exception = ex
        }

        should().exist(exception)
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
