import { expect } from 'chai'
import * as Dyngoose from '.'

describe('Table', () => {
  @Dyngoose.$Table({
    name: `prod-Card${Math.random()}`,
  })
  class Card extends Dyngoose.Table {
    @Dyngoose.$PrimaryKey('id', 'title')
    public static readonly primaryKey: Dyngoose.Query.PrimaryKey<Card, number, string>

    @Dyngoose.$GlobalSecondaryIndex({ hashKey: 'title', projection: 'ALL' })
    public static readonly titleIndex: Dyngoose.Query.GlobalSecondaryIndex<Card, string, void>

    @Dyngoose.Attribute.Any()
    public generic: string

    @Dyngoose.Attribute.Number({ default: 1 })
    public id: number

    @Dyngoose.Attribute.String()
    public title: string

    @Dyngoose.Attribute.DateTime()
    public createdAt: Date

    @Dyngoose.Attribute.Timestamp({ timeToLive: true })
    public expiresAt: number

    @Dyngoose.Attribute('String')
    public defaultedString: string
  }

  beforeEach(async () => {
    await Card.createTable()
  })

  afterEach(async () => {
    await Card.deleteTable()
  })

  it('should create primaryKey', () => {
    expect(Card.primaryKey).to.be.instanceof(Dyngoose.Query.PrimaryKey)
  })

  it('should have attributes properties', async () => {
    const card = new Card()
    card.id = 10
    card.title = '100'

    await card.save()

    const reloadedCard = await Card.primaryKey.get(10, '100')
    expect(reloadedCard).to.be.instanceof(Card)
    if (reloadedCard) {
      expect(reloadedCard.id).to.eq(10)
      expect(reloadedCard.title).to.eq('100')
    }
  })

  it('should works with TTL', async () => {
    const card = new Card()
    card.id = 10
    card.title = '100'
    card.expiresAt = Math.floor(Date.now() / 1000) + 5 // unix timestamp after 5 sec
    await card.save()

    // Wait 15 sec
    await new Promise((resolve) => setTimeout(resolve, 15000))

    const reloaded = await Card.primaryKey.getItem({ hash: 10, range: '100', consistent: true })
    expect(reloaded).to.eq(null)
  })
})
