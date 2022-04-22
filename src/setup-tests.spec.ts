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

  @Dyngoose.Attribute.Date({ unixTimestamp: true })
  public unixTimestamp: Date

  @Dyngoose.Attribute.Date({ millisecondTimestamp: true })
  public msTimestamp: Date

  @Dyngoose.Attribute.Date({ dateOnly: true })
  public dateOnly: Date

  @Dyngoose.Attribute.Date()
  public fullDate: Date

  @Dyngoose.Attribute('String', { default: 'SomeDefault' })
  public defaultedString: string

  @Dyngoose.Attribute.String()
  public testString: string

  @Dyngoose.Attribute.StringSet()
  public testStringSet: string[]

  @Dyngoose.Attribute.String({ lowercase: true })
  public lowercaseString: string

  @Dyngoose.Attribute.String({ uppercase: true })
  public uppercaseString: string

  @Dyngoose.Attribute.String({ trim: true })
  public trimmedString: string

  @Dyngoose.Attribute.Number()
  public testNumber: number

  @Dyngoose.Attribute.NumberSet()
  public testNumberSet?: Array<BigInt | number> | null

  @Dyngoose.Attribute.NumberSet({ default: () => [42, 420] })
  public testNumberSetWithDefaults: number[]

  @Dyngoose.Attribute.Number()
  public testBigInt: BigInt

  @Dyngoose.Attribute.String({ name: 'testAttributeNameNotMatchingPropertyName' })
  public testAttributeNaming: string
}

before(async () => {
  await TestableTable.createTable()
})

after(async () => {
  await TestableTable.deleteTable()
})
