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
    public status: string
  }

  @TableDecorator({ name: 'BatchGetTestCardTable2' })
  class TestTable2 extends Table {
    @PrimaryKeyDecorator('id')
    public static readonly primaryKey: PrimaryKey<TestTable2, number, void>

    @AttributeDecorator.Number()
    public id: number

    @AttributeDecorator.String()
    public status: string
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
      TestTable1.new({ id: 1, status: 'a' }),
      TestTable1.new({ id: 2, status: 'b' }),
      TestTable1.new({ id: 3, status: 'c' }),
      TestTable1.new({ id: 4, status: 'd' }),
    ])

    await TestTable2.documentClient.batchPut([
      TestTable2.new({ id: 1, status: 'a' }),
      TestTable2.new({ id: 2, status: 'b' }),
      TestTable2.new({ id: 3, status: 'c' }),
      TestTable2.new({ id: 4, status: 'd' }),
    ])
  })

  it('should operate a successful batch operation', async () => {
    const batch = new BatchGet<TestTable1 | TestTable2>()
    const item = TestTable1.primaryKey.fromKey(1)

    batch.get(item)
    batch.get(TestTable1.primaryKey.fromKey(2))
    batch.get(TestTable2.primaryKey.fromKey(3))
    batch.get(TestTable2.primaryKey.fromKey(4))

    expect(item.status).to.eq(null)

    // execute the retrieval
    const results = await batch.retrieve()

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
    expect(item.status).to.eq('a')
  })

  it('should operate a successful atomic batch operation', async () => {
    const batch = new BatchGet<TestTable1 | TestTable2>().atomic()
    const item = TestTable1.primaryKey.fromKey(1)

    batch.get(item)
    batch.get(TestTable1.primaryKey.fromKey(2))
    batch.get(TestTable2.primaryKey.fromKey(3))
    batch.get(TestTable2.primaryKey.fromKey(4))

    expect(item.status).to.eq(null)

    // execute the retrieval
    const results = await batch.retrieve()

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
    expect(item.status).to.eq('a')
  })

  it('should return an empty array when nothing matches', async () => {
    const batch = new BatchGet<TestTable1 | TestTable2>()
    batch.get(TestTable1.primaryKey.fromKey(420))
    const results = await batch.retrieve()
    expect(results.length).eq(0)
  })

  it('should not return records that were missing', async () => {
    const batch = new BatchGet<TestTable1>()
    batch.get(TestTable1.primaryKey.fromKey(1))
    batch.get(TestTable1.primaryKey.fromKey(42))

    // execute the retrieval
    const results = await batch.retrieve()

    // now verify the results
    expect(results.length).eq(1)
    expect(results[0].id).eq(1)
  })

  it('should accept projection expressions', async () => {
    const batch = new BatchGet<TestTable1>()
    const item = TestTable1.primaryKey.fromKey(1)
    batch.getSpecificAttributes(TestTable1, 'id')
    batch.get(item)

    // execute the retrieval
    const results = await batch.retrieve()

    expect(results.length).eq(1)
    expect(results[0].status).eq(null)
    expect(item.status).to.eq(null)
    expect(item.toJSON()).to.deep.eq({
      id: 1,
    })
  })

  it('should accept projection expressions with reserved keywords', async () => {
    const batch = new BatchGet<TestTable1 | TestTable2>()
    const item = TestTable1.primaryKey.fromKey(1)
    batch.getSpecificAttributes(TestTable1, 'id', 'status')
    batch.get(item)

    // execute the retrieval
    const results = await batch.retrieve()

    expect(results.length).eq(1)
    expect(results[0].status).eq('a')
    expect(item.status).to.eq('a')
  })
})
