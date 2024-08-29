import { expect, should } from 'chai'
import * as Dyngoose from 'dyngoose'

@Dyngoose.$Table({ name: 'QueryLocalSecondaryIndexCardTable', backup: false })
class Card extends Dyngoose.Table {
  @Dyngoose.$PrimaryKey('id', 'title')
  public static readonly primaryKey: Dyngoose.Query.PrimaryKey<Card, number, string>

  @Dyngoose.$LocalSecondaryIndex('count')
  public static readonly countIndex: Dyngoose.Query.LocalSecondaryIndex<Card>

  @Dyngoose.$DocumentClient()
  public static documentClient: Dyngoose.DocumentClient<Card>

  @Dyngoose.Attribute.Number()
  public id!: number

  @Dyngoose.Attribute.String()
  public title!: string

  @Dyngoose.Attribute.Number()
  public count!: number
}

describe('Query/LocalSecondaryIndex', () => {
  beforeEach(async () => {
    await Card.createTable()
  })

  afterEach(async () => {
    await Card.deleteTable()
  })

  describe('#query', () => {
    it('should find items', async () => {
      await Card.documentClient.batchPut([
        Card.new({ id: 10, title: 'a', count: 4 }),
        Card.new({ id: 10, title: 'b', count: 3 }),
        Card.new({ id: 10, title: 'c', count: 2 }),
        Card.new({ id: 10, title: 'd', count: 1 }),
      ])

      const res = await Card.countIndex.query({
        id: 10,
        count: ['>', 2],
      }, {
        rangeOrder: 'DESC',
      })

      expect(res.records.length).to.eq(2)
      expect(res.records[0].count).to.eq(4)
      expect(res.records[1].count).to.eq(3)
    })

    it('should not find items when aborted', async () => {
      const abortController = new AbortController()
      await Card.documentClient.batchPut([
        Card.new({ id: 10, title: 'a', count: 4 }),
        Card.new({ id: 10, title: 'b', count: 3 }),
        Card.new({ id: 10, title: 'c', count: 2 }),
        Card.new({ id: 10, title: 'd', count: 1 }),
      ])

      abortController.abort()

      let exception
      try {
        await Card.countIndex.query({
          id: 10,
          count: ['>', 2],
        }, {
          abortSignal: abortController.signal,
          rangeOrder: 'DESC',
        })
      } catch (ex) {
        exception = ex
      }

      should().exist(exception)
    })
  })
})
