import { Dyngoose } from '.'

@Dyngoose.$Table({
  name: `testable-${Math.random()}`,
})
export class TestableTable extends Dyngoose.Table {
  @Dyngoose.$PrimaryKey('id', 'title')
  public static readonly primaryKey: Dyngoose.Query.PrimaryKey<TestableTable, number, string>

  @Dyngoose.$GlobalSecondaryIndex({ hashKey: 'title', projection: 'ALL' })
  public static readonly titleIndex: Dyngoose.Query.GlobalSecondaryIndex<TestableTable>

  @Dyngoose.$DocumentClient()
  public static readonly documentClient: Dyngoose.DocumentClient<TestableTable>

  @Dyngoose.Attribute.Any()
  public generic: any

  @Dyngoose.Attribute.Number({ default: 1 })
  public id: number

  @Dyngoose.Attribute.String()
  public title: string

  @Dyngoose.Attribute.Date({ nowOnCreate: true })
  public createdAt: Date

  @Dyngoose.Attribute.Date({ nowOnUpdate: true })
  public updatedAt: Date

  @Dyngoose.Attribute.Date({ timeToLive: true })
  public expiresAt: Date

  @Dyngoose.Attribute('String', { default: 'SomeDefault' })
  public defaultedString: string

  @Dyngoose.Attribute.String()
  public testString: string

  @Dyngoose.Attribute.String({ lowercase: true })
  public lowercaseString: string

  @Dyngoose.Attribute.String({ uppercase: true })
  public uppercaseString: string

  @Dyngoose.Attribute.String({ trim: true })
  public trimmedString: string
}

before(async () => {
  await TestableTable.createTable()
})

after(async () => {
  await TestableTable.deleteTable()
})
