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

    if (reloadedCard != null) {
      expect(reloadedCard.id).to.eq(10)
      expect(reloadedCard.get('id')).to.eq(10)
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

    if (reloadedCard != null) {
      expect(reloadedCard.testString).to.eq(null, 'reloaded testString value compared')
    }
  })

  it('should work with TTL', async () => {
    const card = new TestableTable()
    card.id = 10
    card.title = '100'
    card.expiresAt = new Date(Date.now() + 5000) // 5 secs away
    await card.save()

    // Wait 15 seconds
    await new Promise((resolve) => setTimeout(resolve, 15000))

    const reloaded = await TestableTable.primaryKey.getItem({ hash: 10, range: '100', consistent: true })
    expect(reloaded).to.eq(undefined)
  })

  describe('saving should support conditions', () => {
    context('when condition check was failed', () => {
      it('should throw error', async () => {
        const record = TestableTable.new({ id: 22, title: 'something new' })
        await record.save()

        let error: Error | undefined

        try {
          record.title = 'something blue'
          await record.save({ id: 23 })
        } catch (ex) {
          error = ex
        }

        expect(error).to.be.instanceOf(Error)
          .with.property('name', 'ConditionalCheckFailedException')

        expect(error).to.have.property('message', 'The conditional request failed')
      })
    })

    context('when condition check was passed', () => {
      it('should put item as per provided condition', async () => {
        const record = TestableTable.new({ id: 22, title: 'bar' })

        // save a new record, and confirm the id does not exist… useful to
        // confirm you are adding a new record and not unintentionally updating an existing one
        await record.save({ id: ['not exists'] })

        const reloaded = await TestableTable.primaryKey.getItem({ hash: 22, range: 'bar', consistent: true })
        expect(reloaded).to.be.instanceOf(TestableTable)
      })
    })
  })

  describe('deleting should support conditions', () => {
    context('when condition check was failed', () => {
      it('should throw error', async () => {
        const record = TestableTable.new({ id: 23, title: 'something new' })
        await record.save()

        let error: Error | undefined

        try {
          await record.delete({ id: 24 })
        } catch (ex) {
          error = ex
        }

        expect(error).to.be.instanceOf(Error)
          .with.property('name', 'ConditionalCheckFailedException')

        expect(error).to.have.property('message', 'The conditional request failed')
      })
    })

    context('when condition check was passed', () => {
      it('should delete item as per provided condition', async () => {
        const record = TestableTable.new({ id: 24, title: 'bar' })

        // save a new record, and confirm the id does not exist… useful to
        // confirm you are adding a new record and not unintentionally updating an existing one
        await record.save()

        await record.delete({ id: 24 })

        const reloaded = await TestableTable.primaryKey.getItem({ hash: 24, range: 'bar', consistent: true })
        expect(reloaded).not.to.be.instanceOf(TestableTable)
      })
    })
  })
})
