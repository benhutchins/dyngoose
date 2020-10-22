import { expect } from 'chai'
import { TestableTable } from '../setup-tests.spec'
import { MagicSearch } from './search'

describe('Query/Search', () => {
  before(async () => {
    await TestableTable.documentClient.batchPut([
      TestableTable.new({ id: 500, title: 'Table.search 0', lowercaseString: 'table search 0' }),
      TestableTable.new({ id: 501, title: 'Table.search 1', lowercaseString: 'table search 1' }),
      TestableTable.new({ id: 502, title: 'Table.search 2', lowercaseString: 'table search 2' }),
      TestableTable.new({ id: 503, title: 'Table.search 3', lowercaseString: 'table search 3' }),
      TestableTable.new({ id: 504, title: 'Table.search 4', lowercaseString: 'reject the search 4' }),
      TestableTable.new({ id: 504, title: 'Table.search 5', lowercaseString: 'magic' }),
      TestableTable.new({ id: 504, title: 'Table.search 6', lowercaseString: 'search' }),
      TestableTable.new({ id: 504, title: 'Table.search 7', lowercaseString: 'search' }),
    ])
  })

  it('should search using an available index', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable, { title: 'Table.search 0' })
    const input = search.getInput()
    expect(input.IndexName).to.eq('titleIndex')
    const result = await search.exec()
    expect(result.count).to.eq(1)
    expect(result.records[0].title).to.eq('Table.search 0')
    expect(result.records[0].lowercaseString).to.eq('table search 0')
  })

  it('should ignore index if you are using a special condition', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable, {
      title: ['contains', 'Table.search'],
    })
    const input = search.getInput()
    expect(input.IndexName).to.be.a('undefined')
    expect((input as any).KeyConditionExpression).to.be.a('undefined')
    const result = await search.exec()
    expect(result.count).to.eq(8)
  })

  it('should ignore indexes if none are available', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable, {
      lowercaseString: ['contains', 'table search'],
    })
    const input = search.getInput()
    expect(input.IndexName).to.be.a('undefined')
    expect((input as any).KeyConditionExpression).to.be.a('undefined')
    const result = await search.exec()
    expect(result.count).to.eq(4)
  })

  it('should support AND operators', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable)
      .filter('lowercaseString').eq('search')
      .and()
      .filter('lowercaseString').eq('magic')
    const input = search.getInput()
    expect(input.IndexName).to.be.a('undefined')
    expect(input.FilterExpression).to.eq('#a0 = :v0 AND #a0 = :v1')
    const result = await search.exec()
    expect(result.count).to.eq(0)
  })

  it('should support OR operators', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable)
      .filter('lowercaseString').eq('search')
      .or()
      .filter('lowercaseString').eq('magic')
    const input = search.getInput()
    expect(input.IndexName).to.be.a('undefined')
    expect(input.FilterExpression).to.eq('#a0 = :v0 OR #a0 = :v1')
    const result = await search.exec()
    expect(result.count).to.eq(3)
  })

  it('should support AND and OR operators together', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable)
      .filter('title').contains('Table.search')
      .and()
      .parenthesis((ps) => {
        ps.filter('lowercaseString').eq('search')
          .or()
          .filter('lowercaseString').eq('magic')
      })
    const input = search.getInput()
    expect(input.IndexName).to.be.a('undefined')
    expect(input.FilterExpression).to.eq('contains(#a0, :v0) AND (#a1 = :v1 OR #a1 = :v2)')
    const result = await search.exec()
    expect(result.count).to.eq(3)
  })

  it('ConsistentRead defaults to false', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable)
    const input = search.getInput()
    expect(input.ConsistentRead).to.eq(false)
  })

  it('.consistent sets ConsistentRead on input', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable)
    search.consistent(true)
    const input = search.getInput()
    expect(input.ConsistentRead).to.eq(true)
  })

  it('.using sets IndexName on input', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable)

    // try using the GSI instance
    search.using(TestableTable.titleIndex)
    let input = search.getInput()
    expect(input.IndexName).to.eq('titleIndex')

    // try using the index name
    search.using('titleIndex')
    input = search.getInput()
    expect(input.IndexName).to.eq('titleIndex')
  })

  describe('.sort', () => {
    it('.sort sets ScanIndexForward on input', async () => {
      const search = new MagicSearch<TestableTable>(TestableTable)
      search.sort('descending')
      const input = search.getInput()
      expect((input as any).ScanIndexForward).to.eq(false)
    })

    it('.ascending sets ScanIndexForward on input', async () => {
      const search = new MagicSearch<TestableTable>(TestableTable)
      search.ascending()
      const input = search.getInput()
      expect((input as any).ScanIndexForward).to.eq(undefined)
    })

    it('.descending sets ScanIndexForward on input', async () => {
      const search = new MagicSearch<TestableTable>(TestableTable)
      search.descending()
      const input = search.getInput()
      expect((input as any).ScanIndexForward).to.eq(false)
    })
  })

  it('.limit sets Limit on input', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable)
    search.limit(5)
    const input = search.getInput()
    expect(input.Limit).to.eq(5)
  })

  it('.startAt sets ExclusiveStartKey on input', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable)
    search.startAt({ id: { S: 'test' } })
    const input = search.getInput()
    expect(input.ExclusiveStartKey).to.deep.eq({ id: { S: 'test' } })
  })

  it('.attributes sets ProjectionExpression on input', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable)
    search.attributes('id', 'title', 'testAttributeNaming')
    const input = search.getInput()
    expect(input.ProjectionExpression).to.eq('id,title,testAttributeNameNotMatchingPropertyName')
  })
})
