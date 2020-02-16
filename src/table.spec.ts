import { expect } from 'chai'
import * as Dyngoose from '.'
import { TestableTable } from './setup-tests.spec'

describe('Table', () => {
  it('should create primaryKey', () => {
    expect(TestableTable.primaryKey).to.be.instanceof(Dyngoose.Query.PrimaryKey)
  })

  it('should have attributes properties', async () => {
    const card = new TestableTable()
    card.id = 10
    card.title = '100'

    await card.save()

    const reloadedCard = await TestableTable.primaryKey.get(10, '100')
    expect(reloadedCard).to.be.instanceof(TestableTable)
    if (reloadedCard) {
      expect(reloadedCard.id).to.eq(10)
      expect(reloadedCard.title).to.eq('100')
    }
  })

  it('should allow an attribute to be emptied', async () => {
    const card = new TestableTable()
    card.id = 10
    card.title = '100'
    card.testString = 'some value'
    await card.save()
    expect(card.testString).to.eq('some value', 'initial card created')

    card.testString = ''
    expect(card.testString).to.eq(null, 'cleared strings become null, because DynamoDB does not allow empty string values')
    await card.save()

    const reloadedCard = await TestableTable.primaryKey.get(10, '100')
    expect(reloadedCard).to.be.instanceof(TestableTable)
    if (reloadedCard) {
      expect(reloadedCard.testString).to.eq(null, 'reloaded testString value compared')
    }
  })

  it('should work with TTL', async () => {
    const card = new TestableTable()
    card.id = 10
    card.title = '100'
    card.expiresAt = new Date(Date.now() + 5000) // 5 secs away
    await card.save()

    // Wait 15 sec
    await new Promise((resolve) => setTimeout(resolve, 15000))

    const reloaded = await TestableTable.primaryKey.getItem({ hash: 10, range: '100', consistent: true })
    expect(reloaded).to.eq(undefined)
  })
})
