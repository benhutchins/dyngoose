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

  describe('.remove', () => {
    it('should allow attributes to be removed', async () => {
      const card = TestableTable.new()
      card.id = 101
      card.title = '101'
      card.generic = 'something'
      card.remove('generic')
      card.remove('testString')
      card.testString = 'value is set'

      await card.save()

      const reloadedCard = await TestableTable.primaryKey.get(101, '101')
      expect(reloadedCard).to.be.instanceof(TestableTable)

      if (reloadedCard != null) {
        expect(reloadedCard.id).to.eq(101)
        expect(reloadedCard.get('id')).to.eq(101)
        expect(reloadedCard.title).to.eq('101')
        expect(reloadedCard.generic).to.eq(null)
        expect(reloadedCard.defaultedString).to.eq('SomeDefault')
        expect(reloadedCard.testString).to.eq('value is set')
      }
    })
  })

  it('should support update operators', async () => {
    const card = TestableTable.new({
      id: 98,
      title: '98',
      testString: 'some value',
      testNumber: 11,
      testNumberSet: new Set([1, 2, 3]),
      testAttributeNaming: 'test',
    })
    await card.save()
    expect(card.testNumber).to.eq(11, 'num eq 11')

    card.set('testNumber', 5, { operator: 'decrement' })
    await card.save()

    const reloadedCard = await TestableTable.primaryKey.get(card)
    expect(reloadedCard).to.be.instanceof(TestableTable)

    if (reloadedCard != null) {
      expect(reloadedCard.testNumber).to.eq(11 - 5, 'decrement worked')
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

    const reloaded = await TestableTable.primaryKey.get(10, '100', { consistent: true })
    expect(reloaded).to.eq(undefined)
  })

  it('should be able to query by property names', async () => {
    const results = await TestableTable.primaryKey.scan({
      testAttributeNaming: 'test',
    })

    expect(results.length).to.eq(1)
  })

  describe('saving should support conditions', () => {
    context('when condition check was failed', () => {
      it('should throw error', async () => {
        const record = TestableTable.new({ id: 22, title: 'something new' })
        await record.save()

        let error: Error | undefined

        try {
          record.generic = 'something blue'
          await record.save({ conditions: { generic: 'fail' } })
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
        await record.save({ conditions: { id: ['not exists'] } })

        const reloaded = await TestableTable.primaryKey.get({ id: 22, title: 'bar' }, { consistent: true })
        expect(reloaded).to.be.instanceOf(TestableTable)
      })
    })
  })

  describe('saving should support returnValue', () => {
    it('should parse the returned values', async () => {
      const newRecord = TestableTable.new({
        id: 99,
        title: 'new record',
        generic: 'before update',
        unixTimestamp: new Date(),
      })
      await newRecord.save()

      // load the record we just created
      const record = TestableTable.primaryKey.fromKey({
        id: 99,
        title: 'new record',
      })

      record.generic = 'after update'
      const output = await record.save({ returnOutput: true, operator: 'update', returnValues: 'ALL_OLD' })

      expect(output.Attributes).to.not.be.a('undefined')

      if (output.Attributes != null) {
        const oldRecord = TestableTable.fromDynamo(output.Attributes)
        expect(oldRecord.generic).to.eq('before update')
      }
    })
  })

  describe('deleting should support conditions', () => {
    context('when condition check was failed', () => {
      it('should throw error', async () => {
        const record = TestableTable.new({ id: 23, title: 'something new' })
        await record.save()

        let error: Error | undefined

        try {
          await record.delete({ conditions: { id: 24 } })
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

        await record.delete({ conditions: { id: 24 } })

        const reloaded = await TestableTable.primaryKey.get(record, { consistent: true })
        expect(reloaded).not.to.be.instanceOf(TestableTable)
      })
    })
  })

  it('should apply default values', () => {
    const record = TestableTable.new()
    expect(record.id).to.eq(1)
    expect(record.defaultedString).to.eq('SomeDefault')
    expect(Array.from(record.testNumberSetWithDefaults)).to.deep.eq([42, 420])
  })

  it('should not apply defaults when the record is loaded from DynamoDB', () => {
    const record = TestableTable.fromDynamo({})
    expect(record.id).to.eq(null)
  })

  describe('#toJSON', () => {
    it('should export to an object', () => {
      const record = TestableTable.new()
      expect(record.toJSON()).to.deep.eq({
        id: 1,
        defaultedString: 'SomeDefault',
        testNumberSetWithDefaults: [42, 420],
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      })
    })

    it('should not apply defaults when the record is loaded from DynamoDB', () => {
      const record = TestableTable.fromDynamo({})
      expect(record.toJSON()).to.deep.eq({})
    })
  })
})
