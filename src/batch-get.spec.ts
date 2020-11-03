import { expect } from 'chai'
import { sortBy } from 'lodash'
import { BatchGet } from './batch-get'
import { PrimaryKey } from './query/primary-key'
import { Table } from './table'

import {
  Attribute as AttributeDecorator,
  PrimaryKey as PrimaryKeyDecorator,
  Table as TableDecorator,
} from './decorator'

describe('BatchGet', () => {
  @TableDecorator({ name: 'BatchGetTestCardTable1' })
  class TestTable1 extends Table {
    @PrimaryKeyDecorator('id')
    public static readonly primaryKey: PrimaryKey<TestTable1, number, void>

    @AttributeDecorator.Number()
    public id: number

    @AttributeDecorator.String()
    public title: string
  }

  @TableDecorator({ name: 'BatchGetTestCardTable2' })
  class TestTable2 extends Table {
    @PrimaryKeyDecorator('id')
    public static readonly primaryKey: PrimaryKey<TestTable2, number, void>

    @AttributeDecorator.Number()
    public id: number

    @AttributeDecorator.String()
    public title: string
  }

  before(async () => {
    await TestTable1.createTable()
    await TestTable2.createTable()
  })

  after(async () => {
    await TestTable1.deleteTable()
    await TestTable2.deleteTable()
  })

  beforeEach(async () => {
    await TestTable1.documentClient.batchPut([
      TestTable1.new({ id: 1, title: 'a' }),
      TestTable1.new({ id: 2, title: 'b' }),
      TestTable1.new({ id: 3, title: 'c' }),
      TestTable1.new({ id: 4, title: 'd' }),
    ])

    await TestTable2.documentClient.batchPut([
      TestTable2.new({ id: 1, title: 'a' }),
      TestTable2.new({ id: 2, title: 'b' }),
      TestTable2.new({ id: 3, title: 'c' }),
      TestTable2.new({ id: 4, title: 'd' }),
    ])
  })

  it('should operate a successful batch operation', async () => {
    const batch = new BatchGet()
    const item = TestTable1.primaryKey.fromKey(1)

    batch.get(item)
    batch.get(TestTable1.primaryKey.fromKey(2))
    batch.get(TestTable2.primaryKey.fromKey(3))
    batch.get(TestTable2.primaryKey.fromKey(4))

    expect(item.title).to.eq(null)

    // commit the transaction
    const results = await batch.retrieve() as Array<TestTable1 | TestTable2>

    // now verify the results
    const records = sortBy(results, 'id')

    expect(results.length).eq(4)
    expect(records[0].id).eq(1)
    expect(records[0]).to.be.instanceOf(TestTable1)
    expect(records[1].id).eq(2)
    expect(records[1]).to.be.instanceOf(TestTable1)
    expect(records[2].id).eq(3)
    expect(records[2]).to.be.instanceOf(TestTable2)
    expect(records[3].id).eq(4)
    expect(records[3]).to.be.instanceOf(TestTable2)

    // verify the original items are mutated
    expect(item.title).to.eq('a')
  })
})
