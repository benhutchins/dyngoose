import { expect } from 'chai'
import * as Dyngoose from '../..'

interface ITestMap {
  first: string
  middle: string
  last: string
  level: number
  nick?: string
}

@Dyngoose.$Table({
  name: `MapTest-${Math.random()}`,
})
export class MapTestTable extends Dyngoose.Table {
  @Dyngoose.$PrimaryKey('id')
  public static readonly primaryKey: Dyngoose.Query.PrimaryKey<MapTestTable, number, void>

  @Dyngoose.$DocumentClient()
  public static readonly documentClient: Dyngoose.DocumentClient<MapTestTable>

  @Dyngoose.Attribute.Number()
  id: number

  @Dyngoose.Attribute.Map({
    attributes: {
      first: Dyngoose.Attribute.String(),
      middle: Dyngoose.Attribute.String(),
      last: Dyngoose.Attribute.String(),
      level: Dyngoose.Attribute.Number(),
      nick: Dyngoose.Attribute.String(),
    },
  })
  public person: ITestMap
}

describe('AttributeType/Map', () => {
  before(async () => {
    await MapTestTable.createTable()
  })

  after(async () => {
    await MapTestTable.deleteTable()
  })

  it('should store the object as a map', async () => {
    const record = MapTestTable.new({
      id: 1,
      person: {
        first: 'John',
        middle: 'Jacobs',
        last: 'Smith',
        level: 1,
        // nick is left empty to ensure optional properties work
      },
    })

    await record.save()

    expect(record.getAttributeDynamoValue('person')).to.deep.eq({
      M: {
        first: { S: 'John' },
        middle: { S: 'Jacobs' },
        last: { S: 'Smith' },
        level: { N: '1' },
      },
    })

    expect(record.person.first).to.eq('John')

    expect(record.getAttributeDynamoValue('person')).to.deep.eq({
      M: {
        first: { S: 'John' },
        middle: { S: 'Jacobs' },
        last: { S: 'Smith' },
        level: { N: '1' },
      },
    })
  })

  it('should allow you to query using child attributes', async () => {
    const record = MapTestTable.new({
      id: 2,
      person: {
        first: 'Sally',
        middle: 'Shelly',
        last: 'Samuel',
        level: 1,
        // nick is left empty to ensure optional properties work
      },
    })

    await record.save()

    const result = await MapTestTable.search({
      'person.first': 'Sally',
    } as any).exec()

    expect(result.count).to.eq(1)
    expect(result.records[0].person.first).to.eq('Sally')
  })
})
