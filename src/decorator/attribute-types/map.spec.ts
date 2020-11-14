import { expect, should } from 'chai'
import * as Dyngoose from '../..'

interface ITestMap {
  first: string
  middle: string
  last: string
  level: number
  nick?: string
}

interface ITestContactMap {
  name: {
    first: string
    last: string
  }
  address?: {
    line1: string
    city: string
    state: string
  }
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

  @Dyngoose.Attribute.Map({
    attributes: {
      name: Dyngoose.Attribute.Map({
        attributes: {
          first: Dyngoose.Attribute.String({ lowercase: true }),
          last: Dyngoose.Attribute.String({ uppercase: true }),
        },
      }),
      address: Dyngoose.Attribute.Map({
        attributes: {
          line1: Dyngoose.Attribute.String(),
          city: Dyngoose.Attribute.String(),
          state: Dyngoose.Attribute.String(),
        },
      }),
    },
  })
  public contact: ITestContactMap
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
    expect(result[0].person.first).to.eq('Sally')
    expect(result.records[0].person.first).to.eq('Sally')

    // ensure you can look through the result as an array
    for (const doc of result) {
      expect(doc.person.first).to.eq('Sally')
    }
  })

  it('should allow maps within maps', async () => {
    const record = MapTestTable.new({
      id: 3,
      contact: {
        name: {
          first: 'Homer',
          last: 'Simpson',
        },
        address: {
          line1: '742 Evergreen Terrace',
          city: 'Springfield',
          state: 'Simpcity',
        },
      },
    })

    expect(record.contact?.name.first).to.eq('homer')
    expect(record.contact?.name.last).to.eq('SIMPSON')

    await record.save()

    const loaded = await MapTestTable.primaryKey.get(3)

    should().exist(loaded)

    if (loaded != null) {
      expect(loaded.getAttributeDynamoValue('contact')).to.deep.eq({
        M: {
          name: {
            M: {
              first: { S: 'homer' },
              last: { S: 'SIMPSON' },
            },
          },
          address: {
            M: {
              line1: { S: '742 Evergreen Terrace' },
              city: { S: 'Springfield' },
              state: { S: 'Simpcity' },
            },
          },
        },
      })

      expect(record.contact.name.first).to.eq('homer')
      expect(record.contact.name.last).to.eq('SIMPSON')
    }
  })

  it('should allow you to query using deep child attributes', async () => {
    const record = MapTestTable.new({
      id: 4,
      contact: {
        name: {
          first: 'Marge',
          last: 'Simpson',
        },
      },
    })

    await record.save()

    const result = await MapTestTable.search({
      'contact.name.first': 'Marge',
    } as any).exec()

    expect(result.count).to.eq(1)
    expect(result.length).to.eq(1)
    expect(result[0].contact.name.first).to.eq('marge')
  })
})
