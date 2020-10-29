import { expect } from 'chai'
import { sortBy } from 'lodash'
import { BatchWrite } from './batch-write'
import { PrimaryKey } from './query/primary-key'
import { Table } from './table'

import {
  Attribute as AttributeDecorator,
  PrimaryKey as PrimaryKeyDecorator,
  Table as TableDecorator,
} from './decorator'

describe('BatchWrite', () => {
  @TableDecorator({ name: 'BatchWriteTestCardTable' })
  class Card extends Table {
    @PrimaryKeyDecorator('id', 'title')
    public static readonly primaryKey: PrimaryKey<Card, number, string>

    @AttributeDecorator.Number()
    public id: number

    @AttributeDecorator.String()
    public title: string

    @AttributeDecorator.Number()
    public count: number
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
    const batch = new BatchWrite()

    // add a new record
    batch.put(Card.new({ id: 42, title: 'new record', count: 1 }))

    // delete a few records
    batch.delete(Card.primaryKey.fromKey(10, 'b'))
    batch.delete(
      Card.primaryKey.fromKey(10, 'c'),
      Card.primaryKey.fromKey(10, 'd'),
    )

    // commit the transaction
    await batch.commit()

    // now verify the results
    const results = await Card.primaryKey.scan()
    const records = sortBy(results, 'id')

    expect(results.count).eq(2)
    expect(records[0].id).eq(10)
    expect(records[1].id).eq(42)
  })
})
