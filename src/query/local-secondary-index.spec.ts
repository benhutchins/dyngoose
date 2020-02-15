import { expect } from 'chai'
import * as Decorator from '../decorator'
import { DocumentClient } from '../document-client'
import { Table } from '../table'
import * as Query from './index'

@Decorator.Table({ name: 'QueryLocalSecondaryIndexCardTable' })
class Card extends Table {
  @Decorator.PrimaryKey('id', 'title')
  public static readonly primaryKey: Query.PrimaryKey<Card, number, string>

  @Decorator.LocalSecondaryIndex('count')
  public static readonly countIndex: Query.LocalSecondaryIndex<Card, number, number>

  @Decorator.DocumentClient()
  public static documentClient: DocumentClient<Card>

  public static create(id: number, title: string, count: number) {
    const record = new this()
    record.id = id
    record.title = title
    record.count = count
    return record
  }

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
        Card.create(10, 'a', 4),
        Card.create(10, 'b', 3),
        Card.create(10, 'c', 2),
        Card.create(10, 'd', 1),
      ])

      const res = await Card.countIndex.query({
        hash: 10,
        rangeOrder: 'DESC',
        range: ['>', 2],
      })

      expect(res.records.length).to.eq(2)

      expect(res.records[0].count).to.eq(4)
      expect(res.records[1].count).to.eq(3)
    })
  })
})
