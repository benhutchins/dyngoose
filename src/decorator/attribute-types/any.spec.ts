import { expect } from 'chai'
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

    expect(record.generic).eq(null)
    record.generic = value
    expect(record.generic).to.deep.eq(value)
    expect(record.getAttributeDynamoValue('generic')).deep.eq({ S: JSON.stringify(value) })
    await record.save()

    const loaded = await TestableTable.primaryKey.get(30, 'json test')
    expect(record.generic).to.deep.eq(value, 'after loading record from dynamo')
  })
})
