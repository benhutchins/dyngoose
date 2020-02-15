import { expect } from 'chai'
import { Table } from '../table'
import { PrimaryKey } from './primary-key'

import {
  Attribute as AttributeDecorator,
  PrimaryKey as PrimaryKeyDecorator,
  Table as TableDecorator,
} from '../decorator'

describe('Query/PrimaryKey', () => {
  @TableDecorator({ name: 'QueryPrimaryKeyCardTable' })
  class Card extends Table {
    @PrimaryKeyDecorator('id', 'title')
    public static readonly primaryKey: PrimaryKey<Card, number, string>

    @AttributeDecorator.Number()
    public id: number

    @AttributeDecorator.String()
    public title: string

    @AttributeDecorator.Number()
    public count: number
  }

  let primaryKey: PrimaryKey<Card, number, string>

  beforeEach(async () => {
    await Card.createTable()
    primaryKey = Card.primaryKey
  })

  afterEach(async () => {
    await Card.deleteTable()
  })

  describe('#delete', async () => {
    it('should delete item if exist', async () => {
      await new Card({ id: 10, title: 'abc' }).save()

      await primaryKey.delete(10, 'abc')

      expect(await primaryKey.get(10, 'abc')).to.eq(null)
    })
  })

  // describe('#get', async () => {
  //   it('should find item', async () => {
  //     const item = await primaryKey.get(10, 'abc')
  //     expect(item).to.eq(null)
  //   })

  //   it('should find item', async () => {
  //     await Card.metadata.connection.documentClient.put({
  //       TableName: Card.metadata.name,
  //       Item: {
  //         id: 10,
  //         title: 'abc',
  //       },
  //     }).promise()
  //     const item = await primaryKey.get(10, 'abc')
  //     expect(item).to.be.instanceof(Card)
  //     expect(item!.id).to.eq(10)
  //     expect(item!.title).to.eq('abc')
  //   })
  // })

  // describe('#bacthGet', async () => {
  //   it('should find items', async () => {
  //     await Card.metadata.connection.documentClient.put({
  //       TableName: Card.metadata.name,
  //       Item: {
  //         id: 10,
  //         title: 'abc',
  //       },
  //     }).promise()
  //     await Card.metadata.connection.documentClient.put({
  //       TableName: Card.metadata.name,
  //       Item: {
  //         id: 11,
  //         title: 'abc',
  //       },
  //     }).promise()
  //     await Card.metadata.connection.documentClient.put({
  //       TableName: Card.metadata.name,
  //       Item: {
  //         id: 12,
  //         title: 'abc',
  //       },
  //     }).promise()

  //     const items1 = (await primaryKey.batchGet([
  //       [10, 'abc'],
  //       [11, 'abc'],
  //     ])).records
  //     expect(items1.length).to.eq(2)
  //     expect(items1[0].id).to.eq(10)
  //     expect(items1[1].id).to.eq(11)

  //     const items2 = (await primaryKey.batchGetFull([
  //       [10, 'abc'],
  //       [10000, 'asdgasdgs'],
  //       [11, 'abc'],
  //     ])).records
  //     expect(items2.length).to.eq(3)
  //     expect(items2[0]!.id).to.eq(10)
  //     expect(items2[0]!.title).to.eq('abc')
  //     expect(items2[1]).to.eq(undefined)
  //     expect(items2[2]!.id).to.eq(11)
  //     expect(items2[2]!.title).to.eq('abc')
  //   })
  // })

  // describe('#query', () => {
  //   it('should find items', async () => {
  //     await Card.metadata.connection.documentClient.put({
  //       TableName: Card.metadata.name,
  //       Item: {
  //         id: 10,
  //         title: 'abc',
  //       },
  //     }).promise()
  //     await Card.metadata.connection.documentClient.put({
  //       TableName: Card.metadata.name,
  //       Item: {
  //         id: 10,
  //         title: 'abd',
  //       },
  //     }).promise()
  //     await Card.metadata.connection.documentClient.put({
  //       TableName: Card.metadata.name,
  //       Item: {
  //         id: 10,
  //         title: 'aba',
  //       },
  //     }).promise()

  //     let res = await primaryKey.query({
  //       hash: 10,
  //       range: ['between', 'abc', 'abf'],
  //     })

  //     expect(res.records.length).to.eq(2)
  //     expect(res.records[0].title).to.eq('abc')
  //     expect(res.records[1].title).to.eq('abd')

  //     res = await primaryKey.query({
  //       hash: 10,
  //       range: ['between', 'abc', 'abf'],
  //       rangeOrder: 'DESC',
  //     })

  //     expect(res.records.length).to.eq(2)
  //     expect(res.records[0].title).to.eq('abd')
  //     expect(res.records[1].title).to.eq('abc')
  //   })
  // })

  // describe('#scan', () => {
  //   it('should find items', async () => {
  //     await Card.metadata.connection.documentClient.put({
  //       TableName: Card.metadata.name,
  //       Item: {
  //         id: 10,
  //         title: 'abc',
  //       },
  //     }).promise()
  //     await Card.metadata.connection.documentClient.put({
  //       TableName: Card.metadata.name,
  //       Item: {
  //         id: 10,
  //         title: 'abd',
  //       },
  //     }).promise()
  //     await Card.metadata.connection.documentClient.put({
  //       TableName: Card.metadata.name,
  //       Item: {
  //         id: 10,
  //         title: 'aba',
  //       },
  //     }).promise()

  //     const res = await primaryKey.scan({
  //       limit: 2,
  //     })

  //     expect(res.records.length).to.eq(2)
  //     // Ordered by range key since it's "scan"
  //     expect(res.records[0].title).to.eq('aba')
  //     expect(res.records[1].title).to.eq('abc')
  //   })
  // })
  // describe('#update', () => {
  //   it('should be able to update items', async () => {
  //     await primaryKey.update(10, 'abc', { count: ['ADD', 1] })

  //     let card = await primaryKey.get(10, 'abc')
  //     expect(card!.count).to.eq(1)

  //     await primaryKey.update(10, 'abc', { count: ['ADD', 2] })

  //     card = await primaryKey.get(10, 'abc')
  //     expect(card!.count).to.eq(3)
  //   })
  // })
})
