import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import { Attribute } from '../attribute'
import * as Metadata from '../metadata'
import { Schema } from '../tables/schema'
import { Filter, Filters, FilterValueType } from './filters'

interface Expression {
  ExpressionAttributeNames: DynamoDB.ExpressionAttributeNameMap
  ExpressionAttributeValues: DynamoDB.ExpressionAttributeValueMap
  FilterExpression?: string
  KeyConditionExpression?: string
}

type ConditionOperator = '=' | '<>' | '<' | '<=' | '>' | '>=' | 'beginsWith' | 'between'
type FilterOperator = ConditionOperator | 'includes' | 'excludes' | 'or' | 'contains' | 'null' | 'not null' | 'exists' | 'not exists'

const keyConditionAllowedOperators: ConditionOperator[] = [
  '=',
  '<',
  '<=',
  '>',
  '>=',
  'between',
  'beginsWith',
]

type IndexMetadata = Metadata.Index.GlobalSecondaryIndex | Metadata.Index.PrimaryKey

export function buildQueryExpression(schema: Schema, filters: Filters, index?: IndexMetadata): Expression {
  const filterExpression = new FilterExpressionQuery(schema, filters, index)
  const filterConditions = filterExpression.filterConditions
  const keyConditions = filterExpression.keyConditions

  const query: Expression = {
    ExpressionAttributeValues: filterExpression.values,
    ExpressionAttributeNames: filterExpression.attrs,
  }

  if (filterConditions.length > 0) {
    query.FilterExpression = filterConditions.join(' AND ')
  }

  if (keyConditions.length > 0) {
    query.KeyConditionExpression = keyConditions.join(' AND ')
  }

  return query
}

interface FilterCondition {
  attribute: Attribute<any>
  filter: string
}

class FilterExpressionQuery {
  // public query: string[] = []
  public attrs: DynamoDB.ExpressionAttributeNameMap = {}
  public values: DynamoDB.ExpressionAttributeValueMap = {}

  private filterConditionsMap: FilterCondition[] = []
  private keyConditionsMap: FilterCondition[] = []

  get filterConditions(): string[] {
    return this.filterConditionsMap.map((condition) => condition.filter)
  }

  get keyConditions(): string[] {
    return this.keyConditionsMap.map((condition) => condition.filter)
  }

  constructor(public schema: Schema, public filters: Filters, public indexMetadata?: IndexMetadata) {
    this.parse()

    // double check, we can't filter by the range as a key condition without a value for the HASH
    if (this.keyConditionsMap.length === 1) {
      const condition = this.keyConditionsMap[0]
      const attribute = condition.attribute

      if (this.isRangeKey(attribute)) {
        this.filterConditionsMap.push(condition)
        this.keyConditionsMap = []
      }
    }
  }

  private parse() {
    let prefix = 0

    _.each(this.filters, (value, attrName: string) => {
      const attribute = this.schema.getAttributeByName(attrName, false)

      let filter: Filter

      if (_.isArray(value)) {
        filter = value
      } else {
        filter = ['=', value]
      }

      const queryValue = this.parseFilter(prefix.toString(), attribute, filter, attrName)

      if (queryValue.query) {
        _.extend(this.attrs, queryValue.attrs)
        _.extend(this.values, queryValue.values)
        this.push(attribute, queryValue.query, filter[0])
      }

      prefix++
    })
  }

  /**
   * Convert an array of Query.Condition to use an OR operator,
   * so any value is a possible match
   */
  // private parseArrayOfQueryConditions(prefix: string, attr: Attribute<any>, conditions: Condition<any>[], attrName?: string) {
  //   const possibilities: string[] = []

  //   _.each(conditions, (condition, index: number) => {
  //     const queryFilter = this.parseValue(prefix + index.toString(), attr, condition, attrName)

  //     if (queryFilter.query) {
  //       possibilities.push(queryFilter.query)
  //       _.extend(this.attrs, queryFilter.attrs)
  //       _.extend(this.values, queryFilter.values)
  //     }
  //   })

  //   const query = possibilities.join(' OR ')
  //   this.push(attr, `(${query})`, Query.OPERATOR.IN)
  // }

  private parseFilter(
    prefix: string,
    attr: Attribute<any>,
    filter: Filter,
    attrName?: string,
  ): QueryFilterQuery {
    const attrs: DynamoDB.ExpressionAttributeNameMap = {}
    const values: DynamoDB.ExpressionAttributeValueMap = {}
    let query: string | undefined

    let attrNameMappedTo: string

    if (attrName && attrName.includes('.')) {
      attrNameMappedTo = attrName
      attrName.split('.').forEach((attrNameSegment, i) => {
        const attrNameSegmentMappedTo = '#a' + prefix + String(i)
        attrs[attrNameSegmentMappedTo] = attrNameSegment
        attrNameMappedTo = attrNameMappedTo.replace(attrNameSegment, attrNameSegmentMappedTo)
      })
    } else {
      attrNameMappedTo = '#a' + prefix
      attrs[attrNameMappedTo] = attr.name
    }

    const operator: FilterOperator = filter[0]
    const variableName = ':v' + prefix

    switch (operator) {
      case '=':
      case '<>':
      case '<':
      case '<=':
      case '>':
      case '>=':
        const filterValue = attr.toDynamoAssert(filter[1])
        query = `${attrNameMappedTo} ${operator} ${variableName}`
        values[variableName] = filterValue
        break

      case 'contains':
      case 'beginsWith':
        const strValue = attr.toDynamoAssert(filter[1])
        const queryOperator = operator === 'beginsWith' ? 'begins_with' : operator
        query = `${queryOperator}(${attrNameMappedTo}, ${variableName})`
        values[variableName] = strValue
        break

      case 'exists':
      case 'not exists':
        const existsOperator = operator === 'exists' ? 'attribute_exists' : 'attribute_not_exists'
        query = `${existsOperator}(${attrNameMappedTo})`
        break

      case 'includes':
      case 'excludes':
        const filterValues = filter[1] as FilterValueType[]
        const possibleVariableNames: string[] = []

        _.each(filterValues, (possibleValue, possibleValueIndex) => {
          const value = attr.toDynamoAssert(possibleValue)
          const possibleVariableName = ':v' + prefix + String(possibleValueIndex)
          possibleVariableNames.push(possibleVariableName)
          this.values[possibleVariableName] = value
        })

        const possibleVariableNamesStr = possibleVariableNames.join(', ')
        query = `${attrNameMappedTo} ${operator === 'includes' ? 'IN' : 'NOT IN'} (${possibleVariableNamesStr})`

        // if ((filter.operator === Query.OPERATOR.IN || filter.operator === Query.OPERATOR.NOT_IN) && _.isArray(filter.value)) {
        //   this.parseArrayOfStrings(prefix, attr, filter.value, filter.operator)
        // } else {
        //   value = attr.toDynamo(filter.value)
        //   operator = filter.operator

        //   // convert String Set (SS) to a String (S)
        //   if (value && _.isString(value.SS)) {
        //     value.S = value.SS
        //     delete value.SS
        //   }
        // }
        break

      case 'null':
        query = `${attrNameMappedTo} = :NULL`
        values[':NULL'] = { NULL: true }
        break

      case 'not null':
        query = `${attrNameMappedTo} = :NOT_NULL`
        values[':NOT_NULL'] = { NULL: false }
        break

      case 'between':
        if (typeof filter[1] !== 'undefined' && typeof filter[2] !== 'undefined') {
          const lowerVariableName = ':vl' + prefix
          const upperVariableName = ':vu' + prefix
          values[lowerVariableName] = attr.toDynamoAssert(filter[1])
          values[upperVariableName] = attr.toDynamoAssert(filter[2])

          query = `${attrNameMappedTo} BETWEEN ${lowerVariableName} AND ${upperVariableName}`
        } else {
          throw new Error('BETWEEN filter missing a lower or upper bound')
        }
        break
    }

    return { values, attrs, query }
  }

  private push(attribute: Attribute<any>, filter: string, operator: FilterOperator) {
    if (this.isAttrInIndex(attribute) && _.includes(keyConditionAllowedOperators, operator)) {
      this.keyConditionsMap.push({ attribute, filter })
    } else {
      this.filterConditionsMap.push({ attribute, filter })
    }
  }

  private isAttrInIndex(attribute: Attribute<any>): boolean {
    if (this.indexMetadata) {
      if (attribute.name === this.indexMetadata.hash.name) {
        return true
      }
      return this.isRangeKey(attribute)
    } else {
      return false
    }
  }

  private isRangeKey(attribute: Attribute<any>): boolean {
    if (this.indexMetadata && this.indexMetadata.range) {
      return this.indexMetadata.range.name === attribute.name
    } else {
      return false
    }
  }
}

interface QueryFilterQuery {
  attrs: DynamoDB.ExpressionAttributeNameMap
  values: DynamoDB.ExpressionAttributeValueMap
  query?: string
}
