import { expect } from 'chai'
import * as Dyngoose from 'dyngoose'

@Dyngoose.$Table({
  name: `missing-table-${Math.random()}`,
  backup: false,
})
export class MissingTable extends Dyngoose.Table {
  @Dyngoose.$PrimaryKey('id', 'title')
  public static readonly primaryKey: Dyngoose.Query.PrimaryKey<MissingTable, number, string>

  @Dyngoose.Attribute.Number({ default: 1 })
  public id!: number

  @Dyngoose.Attribute.String()
  public title!: string
}

describe('DyngooseError', () => {
  it('should throw "Cannot do operations on a non-existent table"', async () => {
    const record = MissingTable.new({
      id: 1,
      title: 'test',
    })

    let error: Error | undefined

    try {
      await record.save()
    } catch (ex: any) {
      error = ex
    }

    expect(error).to.be.instanceOf(Error)
      .with.property('name', 'ResourceNotFoundException')

    expect(error).to.have.property('message', 'Cannot do operations on a non-existent table')
  })
})
