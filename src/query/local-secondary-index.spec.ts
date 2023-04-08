import { expect } from 'chai'
import * as Decorator from '../decorator'
import { DocumentClient } from '../document-client'
import { Table } from '../table'
import * as Query from './index'

@Decorator.Table({ name: 'QueryLocalSecondaryIndexCardTable', backup: false })
class Card extends Table {
  @Decorator.PrimaryKey('id', 'title')
  public static readonly primaryKey: Query.PrimaryKey<Card, number, string>

  @Decorator.LocalSecondaryIndex('count')
  public static readonly countIndex: Query.LocalSecondaryIndex<Card>

  @Decorator.DocumentClient()
  public static documentClient: DocumentClient<Card>

  @Decorator.Attribute.Number()
  public id: number

  @Decorator.Attribute.String()
  public title: string

  @Decorator.Attribute.Number()
  public count: number
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
  })
})
