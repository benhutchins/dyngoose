import { expect, should } from 'chai'
import { TestableTable } from '../setup-tests.spec'
import { MagicSearch } from './search'

describe('Query/Search', () => {
  before(async () => {
    const sets = { testStringSet: new Set(['search']), testStringSetArray: ['search'] }
    await TestableTable.documentClient.batchPut([
      TestableTable.new({ id: 500, title: 'Table.search 0', lowercaseString: 'table search 0', ...sets }),
      TestableTable.new({ id: 501, title: 'Table.search 1', lowercaseString: 'table search 1', ...sets }),
      TestableTable.new({ id: 502, title: 'Table.search 2', lowercaseString: 'table search 2', ...sets }),
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

  it('should not search when aborted', async () => {
    const abortController = new AbortController()

    const search = new MagicSearch<TestableTable>(TestableTable, { title: 'Table.search 0' })
    const input = search.getInput()
    expect(input.IndexName).to.eq('titleIndex')
    abortController.abort()

    let exception
    try {
      await search.exec({ abortSignal: abortController.signal })
    } catch (ex) {
      exception = ex
    }

    should().exist(exception)
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
    expect(result.length).to.eq(0)
    expect(result[0]).to.eq(undefined)
    expect(result.map(i => i)[0]).to.eq(undefined)
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

  it('should support filtering on sets', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable)
      .filter('testStringSet').contains('search')
      .and()
      .filter('testStringSetArray').contains('search')
    const input = search.getInput()
    expect(input.IndexName).to.be.a('undefined')
    expect(input.FilterExpression).to.eq('contains(#a0, :v0) AND contains(#a1, :v0)')
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

    // try using the primary key
    search.using(TestableTable.primaryKey)
    input = search.getInput()
    expect(input.IndexName).to.eq(undefined)
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
    search.attributes('id', 'name')
    const input = search.getInput()
    expect(input.ProjectionExpression).to.eq('id,#p0')
    expect(input.ExpressionAttributeNames).to.deep.eq({
      '#p0': 'name',
    })
  })

  it('.properties sets ProjectionExpression on input', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable)
    search.properties('id', 'title', 'testAttributeNaming')
    const input = search.getInput()
    expect(input.ProjectionExpression).to.eq('id,title,testAttributeNameNotMatchingPropertyName')
  })

  it('merges ExpressionAttributeNames correctly', async () => {
    const search = new MagicSearch<TestableTable>(TestableTable)
    search.filter('createdAt').between(new Date(), new Date())
    search.attributes('name')
    search.properties('id', 'createdAt', 'title', 'testAttributeNaming')
    const input = search.getInput()
    expect(input.ExpressionAttributeNames).to.deep.eq({
      '#a0': 'createdAt',
      '#p0': 'name',
    })
    expect(input.ProjectionExpression).to.eq('#p0,id,#a0,title,testAttributeNameNotMatchingPropertyName')
  })

  describe('#exec', () => {
    it('should execute the search query', async () => {
      const search = new MagicSearch<TestableTable>(TestableTable)
        .filter('title').contains('Table.search')
      const output = await search.exec()
      expect(output.length).to.eq(8)
    })

    it('honor a limited search', async () => {
      const search = new MagicSearch<TestableTable>(TestableTable)
        .filter('title').contains('Table.search')
        .limit(2)
      const output = await search.exec()
      expect(output.length).to.eq(2)
    })

    it('allowing paging the entire table when no filters are specified', async () => {
      const search = new MagicSearch<TestableTable>(TestableTable)
      const output = await search.exec()
      expect(output.length).to.be.at.least(8)
    })
  })

  describe('#all', () => {
    it('should execute the search query', async () => {
      const search = new MagicSearch<TestableTable>(TestableTable)
        .filter('title').contains('Table.search')
        .limit(2)

      // we set a limit and then called .all(), so it should page automatically until all results are found
      // this is stupid and slow, it would be faster to remove the limit, but we are testing the paging logic of .all
      const output = await search.all()
      expect(output.length).to.eq(8)
    })

    it('should not return results when aborted', async () => {
      const abortController = new AbortController()
      const search = new MagicSearch<TestableTable>(TestableTable)
        .filter('title').contains('Table.search')
        .limit(2)

      abortController.abort()

      let exception
      try {
        await search.all({ abortSignal: abortController.signal })
      } catch (ex) {
        exception = ex
      }

      should().exist(exception)
    })
  })

  describe('#minimum', () => {
    it('should execute the search query', async () => {
      const search = new MagicSearch<TestableTable>(TestableTable)
        .filter('title').contains('Table.search')
        .limit(2)

      // we set a limit and then called .all(), so it should page automatically until all results are found
      const output = await search.minimum(5)
      expect(output.length).to.be.at.least(5)
    })

    it('should not return results when aborted', async () => {
      const abortController = new AbortController()

      const search = new MagicSearch<TestableTable>(TestableTable)
        .filter('title').contains('Table.search')
        .limit(2)

      abortController.abort()

      let exception
      try {
        await search.minimum(5, { abortSignal: abortController.signal })
      } catch (ex) {
        exception = ex
      }

      should().exist(exception)
    })
  })

  describe('#iteratePages', () => {
    it('should execute the search query', async () => {
      const search = new MagicSearch<TestableTable>(TestableTable)
        .filter('title').contains('Table.search')
        .limit(2)

      let countPages = 0
      let countItems = 0

      for await (const page of search.iteratePages()) {
        countPages++
        countItems += page.length
      }

      expect(countPages).to.be.greaterThanOrEqual(4)
      expect(countItems).to.be.greaterThanOrEqual(8)
    })

    it('should not return results when aborted', async () => {
      const abortController = new AbortController()
      const search = new MagicSearch<TestableTable>(TestableTable)
        .filter('title').contains('Table.search')
        .limit(2)

      abortController.abort()

      let exception
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const item of search.iteratePages({ abortSignal: abortController.signal })) {
          //
        }
        await search.all({ abortSignal: abortController.signal })
      } catch (ex) {
        exception = ex
      }

      should().exist(exception)
    })
  })

  describe('#iterateDocuments', () => {
    it('should execute the search query', async () => {
      const search = new MagicSearch<TestableTable>(TestableTable)
        .filter('title').contains('Table.search')
        .limit(2)

      let count = 0
      let lastItem: TestableTable | undefined

      for await (const item of search.iterateDocuments()) {
        count++
        lastItem = item
      }

      expect(count).to.eq(8)
      should().exist(lastItem)
    })

    it('should not return results when aborted', async () => {
      const abortController = new AbortController()
      const search = new MagicSearch<TestableTable>(TestableTable)
        .filter('title').contains('Table.search')
        .limit(2)

      abortController.abort()

      let exception
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const item of search.iterateDocuments({ abortSignal: abortController.signal })) {
          //
        }
        await search.all({ abortSignal: abortController.signal })
      } catch (ex) {
        exception = ex
      }

      should().exist(exception)
    })
  })
})
