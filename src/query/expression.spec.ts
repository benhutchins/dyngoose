import { expect } from 'chai'
import * as Dyngoose from '..'
import { buildQueryExpression } from './expression'

describe('query/expression', () => {
  interface ISomeMap {
    first: string
    second: string
  }

  @Dyngoose.$Table({ name: 'QueryExpressionDummyTable' })
  class DummyTable extends Dyngoose.Table {
    @Dyngoose.$PrimaryKey('id', 'customer')
    public static readonly primaryKey: Dyngoose.Query.PrimaryKey<DummyTable, string, string>

    @Dyngoose.$GlobalSecondaryIndex({ hashKey: 'customer' })
    public static readonly customerIndex: Dyngoose.Query.GlobalSecondaryIndex<DummyTable>

    @Dyngoose.$GlobalSecondaryIndex({ hashKey: 'id', rangeKey: 'someNumber' })
    public static readonly someIndex: Dyngoose.Query.GlobalSecondaryIndex<DummyTable>

    @Dyngoose.Attribute.String()
    public id: string

    @Dyngoose.Attribute.String()
    public customer: string

    @Dyngoose.Attribute.String()
    public someString: string

    @Dyngoose.Attribute.Number()
    public someNumber: number

    @Dyngoose.Attribute.Boolean()
    public someBool: boolean

    @Dyngoose.Attribute.Map<ISomeMap>({
      attributes: {
        first: Dyngoose.Attribute.String(),
        second: Dyngoose.Attribute.String(),
      },
    })
    public someMap: ISomeMap

    @Dyngoose.Attribute.Map<ISomeMap>({
      attributes: {
        map: Dyngoose.Attribute.Map({
          attributes: {
            first: Dyngoose.Attribute.String(),
            second: Dyngoose.Attribute.String(),
          },
        }),
      },
    })
    public someDeepMap: {
      map: ISomeMap
    }

    @Dyngoose.Attribute.String()
    someNonExistAttr: string
  }

  const schema = DummyTable.schema

  describe('buildQueryExpression', () => {
    it('works with single simple values', () => {
      expect(buildQueryExpression(schema, { someBool: true })).to.deep.equal({
        FilterExpression: '#a0 = :v0',
        ExpressionAttributeNames: {
          '#a0': 'someBool',
        },
        ExpressionAttributeValues: {
          ':v0': { BOOL: true },
        },
      })

      expect(buildQueryExpression(schema, { customer: 'tiny twig' }, DummyTable.customerIndex.metadata)).to.deep.equal({
        KeyConditionExpression: '#a0 = :v0',
        ExpressionAttributeNames: {
          '#a0': 'customer',
        },
        ExpressionAttributeValues: {
          ':v0': { S: 'tiny twig' },
        },
      })
    })

    it('works with complex filters', () => {
      expect(buildQueryExpression(schema, [{ customer: 'tiny twig' }], DummyTable.customerIndex.metadata)).to.deep.equal({
        KeyConditionExpression: '#a0 = :v0',
        ExpressionAttributeNames: {
          '#a0': 'customer',
        },
        ExpressionAttributeValues: {
          ':v0': { S: 'tiny twig' },
        },
      })
    })

    it('works with compound keys', () => {
      expect(buildQueryExpression(schema, {
        'someMap.first': 'bobby',
      })).to.deep.equal({
        FilterExpression: '#a00.#a01 = :v0',
        ExpressionAttributeNames: {
          '#a00': 'someMap',
          '#a01': 'first',
        },
        ExpressionAttributeValues: {
          ':v0': { S: 'bobby' },
        },
      })
    })

    it('works with deep compound keys', () => {
      expect(buildQueryExpression(schema, {
        'someDeepMap.map.first': 'bobby',
      })).to.deep.equal({
        FilterExpression: '#a00.#a01.#a02 = :v0',
        ExpressionAttributeNames: {
          '#a00': 'someDeepMap',
          '#a01': 'map',
          '#a02': 'first',
        },
        ExpressionAttributeValues: {
          ':v0': { S: 'bobby' },
        },
      })
    })

    it('works with multiple simple values', () => {
      expect(buildQueryExpression(schema, {
        id: 'someUniqueValue',
        someNumber: 10,
        someBool: true,
      }, schema.primaryKey)).to.deep.equal({
        KeyConditionExpression: '#a0 = :v0',
        FilterExpression: '#a1 = :v1 AND #a2 = :v2',
        ExpressionAttributeNames: {
          '#a0': 'id',
          '#a1': 'someNumber',
          '#a2': 'someBool',
        },
        ExpressionAttributeValues: {
          ':v0': { S: 'someUniqueValue' },
          ':v1': { N: '10' },
          ':v2': { BOOL: true },
        },
      })
    })

    it('works with special operators', () => {
      expect(buildQueryExpression(schema, {
        id: ['<>', 'someValue'],
        customer: 'tiny twig',
        someNumber: ['>', 100],
        someBool: true,
      })).to.deep.equal({
        FilterExpression: '#a0 <> :v0 AND #a1 = :v1 AND #a2 > :v2 AND #a3 = :v3',
        ExpressionAttributeNames: {
          '#a0': 'id',
          '#a1': 'customer',
          '#a2': 'someNumber',
          '#a3': 'someBool',
        },
        ExpressionAttributeValues: {
          ':v0': { S: 'someValue' },
          ':v1': { S: 'tiny twig' },
          ':v2': { N: '100' },
          ':v3': { BOOL: true },
        },
      })

      expect(buildQueryExpression(schema, {
        customer: 'tiny twig',
        someNumber: ['<', 100],
        someBool: true,
      })).to.deep.equal({
        FilterExpression: '#a0 = :v0 AND #a1 < :v1 AND #a2 = :v2',
        ExpressionAttributeNames: {
          '#a0': 'customer',
          '#a1': 'someNumber',
          '#a2': 'someBool',
        },
        ExpressionAttributeValues: {
          ':v0': { S: 'tiny twig' },
          ':v1': { N: '100' },
          ':v2': { BOOL: true },
        },
      })
    })

    it('you can include or exclude an array of values', () => {
      expect(buildQueryExpression(schema, {
        someString: ['excludes', ['Apples', 'Carrots']],
      })).to.deep.equal({
        FilterExpression: '#a0 NOT IN (:v00, :v01)',
        ExpressionAttributeNames: {
          '#a0': 'someString',
        },
        ExpressionAttributeValues: {
          ':v00': { S: 'Apples' },
          ':v01': { S: 'Carrots' },
        },
      })
    })

    it('works with between operator', () => {
      expect(buildQueryExpression(schema, {
        someNumber: ['between', 100, 200],
      })).to.deep.equal({
        FilterExpression: '#a0 BETWEEN :vl0 AND :vu0',
        ExpressionAttributeNames: {
          '#a0': 'someNumber',
        },
        ExpressionAttributeValues: {
          ':vl0': { N: '100' },
          ':vu0': { N: '200' },
        },
      })
    })

    it('works with contains operator', () => {
      expect(buildQueryExpression(schema, {
        someString: ['contains', 'hello world'],
        someBool: true,
      })).to.deep.equal({
        FilterExpression: 'contains(#a0, :v0) AND #a1 = :v1',
        ExpressionAttributeNames: {
          '#a0': 'someString',
          '#a1': 'someBool',
        },
        ExpressionAttributeValues: {
          ':v0': { S: 'hello world' },
          ':v1': { BOOL: true },
        },
      })
    })

    it('works with includes/IN operator', () => {
      expect(buildQueryExpression(schema, {
        someString: ['includes', ['opt1', 'opt2']],
        someNumber: ['<=', -100],
        someBool: true,
      })).to.deep.equal({
        FilterExpression: '#a0 IN (:v00, :v01) AND #a1 <= :v1 AND #a2 = :v2',
        ExpressionAttributeNames: {
          '#a0': 'someString',
          '#a1': 'someNumber',
          '#a2': 'someBool',
        },
        ExpressionAttributeValues: {
          ':v00': { S: 'opt1' },
          ':v01': { S: 'opt2' },
          ':v1': { N: '-100' },
          ':v2': { BOOL: true },
        },
      })
    })

    it('does not allow includes/IN operator in key conditions', () => {
      expect(buildQueryExpression(schema, {
        id: ['includes', ['opt1', 'opt2']],
        someNumber: ['<=', -100],
        someBool: true,
      })).to.deep.equal({
        FilterExpression: '#a0 IN (:v00, :v01) AND #a1 <= :v1 AND #a2 = :v2',
        ExpressionAttributeNames: {
          '#a0': 'id',
          '#a1': 'someNumber',
          '#a2': 'someBool',
        },
        ExpressionAttributeValues: {
          ':v00': { S: 'opt1' },
          ':v01': { S: 'opt2' },
          ':v1': { N: '-100' },
          ':v2': { BOOL: true },
        },
      })
    })

    // it('works with includes/IN operators within QueryFilter', () => {
    //   expect(buildQueryExpression(schema, {
    //     someString: {
    //       operator: Query.OPERATOR.IN,
    //       value: ['opt1', 'opt2'],
    //     },
    //     someNumber: {
    //       operator: Query.OPERATOR.LTE,
    //       value: -100,
    //     },
    //     someBool: true,
    //   })).to.deep.equal({
    //     FilterExpression: '#a0 IN (:v00, :v01) AND #a1 <= :v1 AND #a2 = :v2',
    //     ExpressionAttributeNames: {
    //       '#a0': 'someString',
    //       '#a1': 'someNumber',
    //       '#a2': 'someBool',
    //     },
    //     ExpressionAttributeValues: {
    //       ':v00': { S: 'opt1' },
    //       ':v01': { S: 'opt2' },
    //       ':v1': { N: '-100' },
    //       ':v2': { BOOL: true },
    //     },
    //   })
    // })

    it('works with OR operator', () => {
      expect(buildQueryExpression(schema, [
        { someNumber: 10 },
        'OR',
        { someNumber: 11 },
      ])).to.deep.equal({
        FilterExpression: '#a0 = :v0 OR #a0 = :v1',
        ExpressionAttributeNames: {
          '#a0': 'someNumber',
        },
        ExpressionAttributeValues: {
          ':v0': { N: '10' },
          ':v1': { N: '11' },
        },
      })

      expect(buildQueryExpression(schema, [
        {
          id: ['includes', ['opt1', 'opt2']],
        },
        [{ someNumber: 10 }, 'OR', { someNumber: 11 }],
        [
          { someString: 'test', someBool: true },
          'OR',
          { someString: 'other', someBool: false },
        ],
      ])).to.deep.equal({
        FilterExpression: '#a0 IN (:v00, :v01) AND (#a1 = :v1 OR #a1 = :v2) AND ((#a2 = :v3 AND #a3 = :v4) OR (#a2 = :v5 AND #a3 = :v6))',
        ExpressionAttributeNames: {
          '#a0': 'id',
          '#a1': 'someNumber',
          '#a2': 'someString',
          '#a3': 'someBool',
        },
        ExpressionAttributeValues: {
          ':v00': { S: 'opt1' },
          ':v01': { S: 'opt2' },
          ':v1': { N: '10' },
          ':v2': { N: '11' },
          ':v3': { S: 'test' },
          ':v4': { BOOL: true },
          ':v5': { S: 'other' },
          ':v6': { BOOL: false },
        },
      })
    })

    it('works with attribute_not_exists operator', () => {
      expect(buildQueryExpression(schema, {
        someNonExistAttr: ['not exists'],
        someNumber: ['>', 100],
        someBool: true,
      })).to.deep.equal({
        FilterExpression: 'attribute_not_exists(#a0) AND #a1 > :v1 AND #a2 = :v2',
        ExpressionAttributeNames: {
          '#a0': 'someNonExistAttr',
          '#a1': 'someNumber',
          '#a2': 'someBool',
        },
        ExpressionAttributeValues: {
          ':v1': { N: '100' },
          ':v2': { BOOL: true },
        },
      })
    })

    it('builds key conditions when an index is provided', () => {
      expect(buildQueryExpression(schema, {
        id: 'some id',
        someNumber: ['>', 100],
        someBool: true,
      }, DummyTable.someIndex.metadata)).to.deep.equal({
        KeyConditionExpression: '#a0 = :v0 AND #a1 > :v1',
        FilterExpression: '#a2 = :v2',
        ExpressionAttributeNames: {
          '#a0': 'id',
          '#a1': 'someNumber',
          '#a2': 'someBool',
        },
        ExpressionAttributeValues: {
          ':v0': { S: 'some id' },
          ':v1': { N: '100' },
          ':v2': { BOOL: true },
        },
      })
    })
  })
})
