import { expect } from 'chai'
import * as Dyngoose from '..'

@Dyngoose.$Table({ name: 'prod-Card1' })
class Card extends Dyngoose.Table {
  @Dyngoose.$PrimaryKey('id', 'title')
  public static readonly primaryKey: Dyngoose.Query.PrimaryKey<Card, number, string>

  @Dyngoose.$DocumentClient()
  public static readonly documentClient: Dyngoose.DocumentClient<Card>

  @Dyngoose.Attribute.Number()
  public id: number

  @Dyngoose.Attribute.String()
  public title: string

  @Dyngoose.Attribute.String({ name: 'complicated_field' })
  public complicatedField: string

  @Dyngoose.Attribute.String()
  public testString: string
}

describe('Table Decorator', () => {
  it('should build table metadata', () => {
    expect(Card.schema.name).eq('prod-Card1')
  })

  it('should create primaryKey', () => {
    expect(Card.primaryKey).to.be.instanceof(Dyngoose.Query.PrimaryKey)
  })

  it('should have writer', () => {
    expect(Card.documentClient).to.be.instanceof(Dyngoose.DocumentClient)
  })

  it('should have attributes properties', () => {
    const card = new Card()
    card.id = 10
    card.title = '100'

    card.complicatedField = 'data'
    expect(card.getAttribute('complicated_field')).to.eq('data')

    card.setAttribute('complicated_field', 'data2')
    expect(card.complicatedField).to.eq('data2')
  })
})
