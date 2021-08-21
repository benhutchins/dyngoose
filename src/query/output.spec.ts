import { ItemList } from 'aws-sdk/clients/dynamodb'
import { expect } from 'chai'
import { TestableTable } from '../setup-tests.spec'
import { QueryOutput } from './output'

describe('Query/Output', () => {
  const emptyItems: ItemList = []
  const someItems: ItemList = [
    {},
    {},
  ]

  it('should create a native array-like object', async () => {
    const output = QueryOutput.fromDynamoOutput(TestableTable, {
      Count: someItems.length,
      Items: someItems,
    }, false)

    expect(output.count).to.eq(someItems.length)
    expect(output.length).to.eq(someItems.length)
    expect(output[0]).to.not.be.eq(undefined)
    expect(output.map(i => i)[0]).to.be.instanceOf(TestableTable)

    for (const item of output) {
      expect(item).to.be.instanceOf(TestableTable)
    }
  })

  it('should merge several outputs into a combined output', async () => {
    const output1 = QueryOutput.fromDynamoOutput(TestableTable, {
      Count: someItems.length,
      Items: someItems,
    }, false)
    const output2 = QueryOutput.fromDynamoOutput(TestableTable, {
      Count: someItems.length,
      Items: someItems,
    }, false)
    const output = QueryOutput.fromSeveralOutputs(TestableTable, [
      output1,
      output2,
    ])

    expect(output.count).to.eq(someItems.length * 2)
    expect(output.length).to.eq(someItems.length * 2)
    expect(output[0]).to.not.eq(undefined)
    expect(output.map(i => i)[0]).to.be.instanceOf(TestableTable)

    for (const item of output) {
      expect(item).to.be.instanceOf(TestableTable)
    }
  })

  it('should ignore possible null items', async () => {
    // this is a bit of overkill to help resolve #482
    const output = QueryOutput.fromDynamoOutput(TestableTable, {
      Count: 0,
      Items: [null as any],
    }, false)

    expect(output.count).to.eq(0)
    expect(output.length).to.eq(0)
    expect(output[0]).to.eq(undefined)
    expect(output.map(i => i)[0]).to.eq(undefined)

    for (const item of output) {
      expect(item).to.eq(undefined)
    }
  })

  it('should return an empty array when there are no items', async () => {
    const output = QueryOutput.fromDynamoOutput(TestableTable, {
      Count: 0,
      Items: emptyItems,
      ScannedCount: 1000,
      LastEvaluatedKey: {},
      ConsumedCapacity: {},
    }, false)

    expect(output.count).to.eq(0)
    expect(output.length).to.eq(0)
    expect(output[0]).to.eq(undefined)
    expect(output.map(i => i)[0]).to.eq(undefined)

    for (const item of output) {
      expect(item).to.eq(undefined)
    }
  })

  it('should merge several empty outputs into a single combined empty output', async () => {
    const output1 = QueryOutput.fromDynamoOutput(TestableTable, {
      Count: 0,
      Items: emptyItems,
    }, false)
    const output2 = QueryOutput.fromDynamoOutput(TestableTable, {
      Count: 0,
      Items: emptyItems,
    }, false)
    const output = QueryOutput.fromSeveralOutputs(TestableTable, [
      output1,
      output2,
    ])

    expect(output.count).to.eq(0)
    expect(output.length).to.eq(0)
    expect(output[0]).to.eq(undefined)
    expect(output.map(i => i)[0]).to.eq(undefined)

    for (const item of output) {
      expect(item).to.eq(undefined)
    }
  })
})
