import { expect, should } from 'chai'

import { TestableTable } from '../../setup-tests.spec'

describe('AttributeType/Any', () => {
  let record: TestableTable

  beforeEach(() => {
    record = new TestableTable()
  })

  it('should store objects into JSON', async () => {
    record.id = 30
    record.title = 'json test'

    const value = {
      dogs: 'good',
      cats: 'okay',
      ferrets: 'stinky',
    }

    expect(record.generic).eq(null, 'starts as null')
    record.generic = value
    expect(record.generic).to.deep.eq(value, 'accepts a javascript object')
    expect(record.getAttributeDynamoValue('generic')).deep.eq({ S: JSON.stringify(value) }, 'stores in json')

    try {
      await record.save()
    } catch (ex) {
      should().not.exist(ex)
    }

    const loaded = await TestableTable.primaryKey.get(30, 'json test')
    expect(loaded).to.be.instanceof(TestableTable)

    if (loaded != null) {
      expect(loaded.generic).to.deep.eq(value, 'after loading record from dynamo')
    }
  })
})
