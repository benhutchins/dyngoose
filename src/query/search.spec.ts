import { expect } from 'chai'
import { TestableTable } from '../setup-tests.spec'
import { MagicSearch } from './search'

describe('Query/Search', () => {
  before(() => {
    TestableTable.documentClient.batchPut([
      TestableTable.new({ id: 500, title: 'Table.search 0', lowercaseString: 'table search 0' }),
      TestableTable.new({ id: 501, title: 'Table.search 1', lowercaseString: 'table search 1' }),
      TestableTable.new({ id: 502, title: 'Table.search 2', lowercaseString: 'table search 2' }),
      TestableTable.new({ id: 503, title: 'Table.search 3', lowercaseString: 'table search 3' }),
      TestableTable.new({ id: 504, title: 'Table.search 4', lowercaseString: 'reject the search 4' }),
    ])
  })

  it('should search using an available index', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable, { title: 'Table.search 0' })
    const input = search.getInput()
    expect(input.IndexName).to.eq('titleIndex')
    expect((input as any).KeyConditionExpression).to.eq('#a0 = :v0')
    const result = await search.search()
    expect(result.count).to.eq(1)
    expect(result.records[0].title).to.eq('Table.search 0')
    expect(result.records[0].lowercaseString).to.eq('table search 0')
  })

  it('should ignore index if you are using a special condition', async () => {
    const search = new MagicSearch(TestableTable, {
      title: ['contains', 'Table.search'],
    })
    const input = search.getInput()
    expect(input.IndexName).to.be.a('undefined')
    expect((input as any).KeyConditionExpression).to.be.a('undefined')
    const result = await search.search()
    expect(result.count).to.eq(5)
  })

  it('should ignore indexes if none are available', async () => {
    const search = new MagicSearch(TestableTable, {
      lowercaseString: ['contains', 'table search'],
    })
    const input = search.getInput()
    expect(input.IndexName).to.be.a('undefined')
    expect((input as any).KeyConditionExpression).to.be.a('undefined')
    const result = await search.search()
    expect(result.count).to.eq(4)
  })
})
