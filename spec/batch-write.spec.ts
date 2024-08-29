import { expect } from 'chai'
import * as Dyngoose from 'dyngoose'

describe('BatchWrite', () => {
  @Dyngoose.$Table({ name: 'BatchWriteTestCardTable', backup: false })
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
      Card.new({ id: 10, title: 'd', count: 1 }),
    ])
  })

  it('should operate a successful batch operation', async () => {
    const batch = new Dyngoose.BatchWrite()

    // add a bunch of records, above the limit for DynamoDB
    for (let i = 0; i < 250; i++) {
      batch.put(Card.new({ id: 42, title: `new record ${i}`, count: i }))
    }

    // delete a few records
    batch.delete(Card.primaryKey.fromKey(10, 'b'))
    batch.delete(
      Card.primaryKey.fromKey(10, 'c'),
      Card.primaryKey.fromKey(10, 'd'),
    )

    // commit the transaction
    await batch.commit()

    // now verify the results
    const results1 = await Card.primaryKey.query({ id: 42 }, { select: 'COUNT' })
    expect(results1.count).eq(250)

    const results2 = await Card.primaryKey.query({ id: 10 })
    expect(results2.count).eq(1)
    expect(results2[0].id).eq(10)
    expect(results2[0].title).eq('a')
  })

  it('should fail with a BatchError', async () => {
    const batch = new Dyngoose.BatchWrite()

    // this will fail because we're using the same hash and range key value, which must be unique in DynamoDB
    // however, one of the documents will be written because BatchWrite is not atomic
    batch.put(Card.new({ id: 1, title: 'same', count: 1 }))
    batch.put(Card.new({ id: 1, title: 'same', count: 2 }))

    let exception: Dyngoose.Errors.BatchError | undefined

    try {
      await batch.commit()
    } catch (ex: any) {
      exception = ex
    }

    expect(exception).to.be.instanceOf(Dyngoose.Errors.BatchError)
  })
})
