import type { TransactionCanceledException } from '@aws-sdk/client-dynamodb'
import { expect, should } from 'chai'
import * as Dyngoose from 'dyngoose'
import { sortBy } from 'lodash'

describe('Transaction', () => {
  @Dyngoose.$Table({ name: 'TransactionTestCardTable', backup: false })
  class Card extends Dyngoose.Table {
    @Dyngoose.$PrimaryKey('id', 'title')
    public static readonly primaryKey: Dyngoose.Query.PrimaryKey<Card, number, string>

    @Dyngoose.Attribute.Number()
    public id!: number

    @Dyngoose.Attribute.String()
    public title!: string

    @Dyngoose.Attribute.Number()
    public count!: number
  }

  before(async () => {
    await Card.createTable()
  })

  after(async () => {
    await Card.deleteTable()
  })

  beforeEach(async () => {
    await Card.documentClient.batchPut([
      Card.new({ id: 10, title: 'a', count: 4 }),
      Card.new({ id: 10, title: 'b', count: 3 }),
      Card.new({ id: 10, title: 'c', count: 2 }),
      Card.new({ id: 11, title: 'd', count: 1 }),
    ])
  })

  it('should operate a successful commit', async () => {
    const transaction = new Dyngoose.Transaction()

    // add a new record
    transaction.save(Card.new({ id: 42, title: 'new record', count: 1 }))

    // perform an update without loading the record
    transaction.update(Card.primaryKey.fromKey(10, 'a').set('count', 5))

    // delete a few records
    transaction.delete(Card.primaryKey.fromKey(10, 'b'), { count: 3 })
    transaction.delete(Card.primaryKey.fromKey(10, 'c'))

    // add a condition
    transaction.conditionCheck(Card.primaryKey.fromKey(11, 'd'), { count: 1 })

    // commit the transaction
    await transaction.commit()

    // now verify the results
    const results = await Card.primaryKey.scan()
    const records = sortBy(results.records, 'id')

    expect(results.count).eq(3)
    expect(records[0].id).eq(10)
    expect(records[1].id).eq(11)
    expect(records[2].id).eq(42)
  })

  it('should fail with a ConditionalCheckFailed error', async () => {
    const transaction = new Dyngoose.Transaction()

    // add a new record
    transaction.save(Card.new({ id: 42, title: 'new record', count: 1 }))

    // add a condition
    transaction.conditionCheck(Card.primaryKey.fromKey(11, 'd'), { count: 3 }) // note: 3 is not the right number

    let error: TransactionCanceledException | undefined

    try {
      await transaction.commit()
    } catch (ex: any) {
      error = ex
    }

    expect(error).to.be.instanceOf(Error)
      .with.property('name', 'TransactionCanceledException')

    should().exist(error?.CancellationReasons)
  })
})
