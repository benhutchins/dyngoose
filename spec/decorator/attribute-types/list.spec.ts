import { expect } from 'chai'
import * as Dyngoose from 'dyngoose'

@Dyngoose.$Table({
  name: `ListTest-${Math.random()}`,
  backup: false,
})
export class ListTestTable extends Dyngoose.Table {
  @Dyngoose.$PrimaryKey('id')
  public static readonly primaryKey: Dyngoose.Query.PrimaryKey<ListTestTable, number>

  @Dyngoose.$DocumentClient()
  public static readonly documentClient: Dyngoose.DocumentClient<ListTestTable>

  @Dyngoose.Attribute.Number()
  public id!: number

  @Dyngoose.Attribute.List()
  public list!: Array<{ a: number, b: boolean }>
}

describe('AttributeType/List', () => {
  before(async () => {
    await ListTestTable.createTable()
  })

  after(async () => {
    await ListTestTable.deleteTable()
  })

  it('should store the array as a list', async () => {
    const record = ListTestTable.new({
      id: 1,
      list: [
        { a: 1, b: true },
        { a: 1, b: false },
        { a: 2, b: true },
        { a: 2, b: false },
      ],
    })

    await record.save()

    const loaded = await ListTestTable.primaryKey.get(1)
    const list = loaded?.getAttributeDynamoValue('list')

    expect(list).to.deep.eq({
      L: [
        { M: { a: { N: '1' }, b: { BOOL: true } } },
        { M: { a: { N: '1' }, b: { BOOL: false } } },
        { M: { a: { N: '2' }, b: { BOOL: true } } },
        { M: { a: { N: '2' }, b: { BOOL: false } } },
      ],
    })
  })
})
