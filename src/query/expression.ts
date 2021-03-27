import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import { Attribute } from '../attribute'
import { QueryError } from '../errors'
import * as Metadata from '../metadata'
import { Table } from '../table'
import { Schema } from '../tables/schema'
import { ComplexFilters, Filter, Filters } from './filters'

interface Expression {
  ExpressionAttributeNames: DynamoDB.ExpressionAttributeNameMap
  ExpressionAttributeValues?: DynamoDB.ExpressionAttributeValueMap
  FilterExpression?: string
  KeyConditionExpression?: string
}

type ConditionOperator = '=' | '<>' | '<' | '<=' | '>' | '>=' | 'beginsWith' | 'between'
type FilterOperator = ConditionOperator | 'includes' | 'excludes' | 'contains' | 'not contains' | 'null' | 'not null' | 'exists' | 'not exists'

export const keyConditionAllowedOperators: ConditionOperator[] = [
  '=',
  '<',
  '<=',
  '>',
  '>=',
  'between',
  'beginsWith',
]

type IndexMetadata = Metadata.Index.GlobalSecondaryIndex | Metadata.Index.PrimaryKey

export function buildQueryExpression<T extends Table>(schema: Schema, filters: Filters<T>, index?: IndexMetadata): Expression {
  const filterExpression = new FilterExpressionQuery<T>(schema, filters, index)
  const filterConditions = filterExpression.filterConditions
  const keyConditions = filterExpression.keyConditions

  const query: Expression = {
    ExpressionAttributeValues: filterExpression.values,
    ExpressionAttributeNames: filterExpression.attrs,
  }

  if (_.size(query.ExpressionAttributeValues) === 0) {
    delete query.ExpressionAttributeValues
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

class FilterExpressionQuery<T extends Table> {
  public attrs: DynamoDB.ExpressionAttributeNameMap = {}
  public values: DynamoDB.ExpressionAttributeValueMap = {}
  public filterConditions: string[] = []

  private readonly keyConditionsMap: FilterCondition[] = []
  private readonly attributeNamePrefixMap: string[] = []
  private readonly valuePrefixMap: any[] = []

  get keyConditions(): string[] {
    return this.keyConditionsMap.map((condition) => condition.filter)
  }

  constructor(public schema: Schema, public filters: Filters<T> | ComplexFilters<T>, public indexMetadata?: IndexMetadata) {
    this.parse()

    // double check, we can't filter by the range as a key condition without a value for the HASH
    if (this.keyConditionsMap.length === 1) {
      const condition = this.keyConditionsMap[0]
      const attribute = condition.attribute

      if (this.isRangeKey(attribute)) {
        this.filterConditions.push(condition.filter)
        this.keyConditionsMap = []
      }
    }
  }

  private parse(): void {
    if (_.isArray(this.filters) && this.filters.length === 1 && !_.isObjectLike(this.filters[0])) {
      this.filters = this.filters[0] as Filters<T>
    }

    if (_.isArray(this.filters)) { // handle ComplexFilters
      const conditions = this.parseComplexFilters(this.filters, false)

      if (conditions.length > 0) {
        this.filterConditions.push(conditions)
      }
    } else {
      _.each(this.filters, (value, attrName) => {
        this.handleFilter(attrName, value)
      })
    }
  }

  private handleFilter(attrName: string, value: any, push = true): QueryFilterQuery {
    const attribute = this.schema.getAttributeByName(attrName)

    let filter: Filter<any>

    if (_.isArray(value)) {
      filter = value as any
    } else {
      filter = ['=', value]
    }

    const queryValue = this.parseFilter(attribute, filter, attrName)

    if (push && queryValue.query != null) {
      _.extend(this.attrs, queryValue.attrs)
      _.extend(this.values, queryValue.values)
      this.push(attribute, queryValue.query, filter[0])
    }

    return queryValue
  }

  private parseComplexFilters(complexFilters: ComplexFilters<T>, child: boolean): string {
    const orGroups: string[] = []
    let conditions: string[] = []

    for (const filters of complexFilters) {
      if (filters === 'OR') {
        if (conditions.length > 0) {
          if (conditions.length > 1) {
            orGroups.push(`(${conditions.join(' AND ')})`)
          } else {
            orGroups.push(conditions.join(' AND '))
          }

          conditions = []
        }
      } else if (_.isArray(filters)) {
        conditions.push(this.parseComplexFilters(filters, true))
      } else {
        _.each(filters, (value, attrName) => {
          const queryValue = this.handleFilter(attrName, value, false)

          const attribute = this.schema.getAttributeByName(attrName)

          if (queryValue.query != null) {
            _.extend(this.attrs, queryValue.attrs)
            _.extend(this.values, queryValue.values)

            if (this.isHashKey(attribute) || this.isRangeKey(attribute)) {
              let filter: Filter<any>

              if (_.isArray(value)) {
                filter = value as any
              } else {
                filter = ['=', value]
              }

              this.push(attribute, queryValue.query, filter[0])
            } else {
              conditions.push(queryValue.query)
            }
          }
        })
      }
    }

    // we push the last remaining conditions as the last remaining OR group
    if (conditions.length > 0) {
      if (conditions.length > 1 && child) {
        orGroups.push(`(${conditions.join(' AND ')})`)
      } else {
        orGroups.push(conditions.join(' AND '))
      }
    }

    return child ? `(${orGroups.join(' OR ')})` : orGroups.join(' OR ')
  }

  private getAttributeNamePrefix(attrName: string): string {
    if (!this.attributeNamePrefixMap.includes(attrName)) {
      this.attributeNamePrefixMap.push(attrName)
    }

    return this.attributeNamePrefixMap.indexOf(attrName).toString()
  }

  private getValuePrefix(value: any): string {
    if (!this.valuePrefixMap.includes(value)) {
      this.valuePrefixMap.push(value)
    }

    return this.valuePrefixMap.indexOf(value).toString()
  }

  private parseFilter(
    attr: Attribute<any>,
    filter: Filter<any>,
    attrName: string,
  ): QueryFilterQuery {
    const attrs: DynamoDB.ExpressionAttributeNameMap = {}
    const values: DynamoDB.ExpressionAttributeValueMap = {}
    const prefix = this.getAttributeNamePrefix(attrName)
    let query: string | undefined
    let attrNameMappedTo: string

    if (attrName?.includes('.')) {
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
    const variableName = ':v' + this.getValuePrefix(filter[1])

    switch (operator) {
      case '=':
      case '<>':
      case '<':
      case '<=':
      case '>':
      case '>=': {
        const filterValue = attr.toDynamoAssert(filter[1])
        query = `${attrNameMappedTo} ${operator} ${variableName}`
        values[variableName] = filterValue
        break
      }

      case 'contains':
      case 'not contains':
      case 'beginsWith': {
        /**
         * Prevent begins_with with number operators, which is not supported by DynamoDB.
         *
         * @see {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#query-property}
         */
        if (operator === 'beginsWith' && attr.type.type === 'N') {
          throw new QueryError('Cannot use beginsWith with number attributes')
        }

        const strValue = attr.toDynamoAssert(filter[1])

        // convert sets to single values, since contains and not contains only work on the single value
        // and sets do not support beginsWith so we don't have to be concerned with that here
        if (strValue.SS != null) {
          strValue.S = _.isArray(strValue.SS) ? strValue.SS[0] : strValue.SS
          delete strValue.SS
        } else if (strValue.NS != null) {
          strValue.N = _.isArray(strValue.NS) ? strValue.NS[0] : strValue.NS
          delete strValue.NS
        } else if (strValue.BS != null) {
          strValue.B = _.isArray(strValue.BS) ? strValue.BS[0] : strValue.BS
          delete strValue.BS
        }

        const queryOperator = operator === 'beginsWith' ? 'begins_with' : operator.replace(' ', '_')
        query = `${queryOperator}(${attrNameMappedTo}, ${variableName})`
        values[variableName] = strValue
        break
      }

      case 'exists':
      case 'not exists': {
        const existsOperator = operator === 'exists' ? 'attribute_exists' : 'attribute_not_exists'
        query = `${existsOperator}(${attrNameMappedTo})`
        break
      }

      case 'includes':
      case 'excludes': {
        const filterValues = filter[1] as any[]
        const possibleVariableNames: string[] = []

        _.each(filterValues, (possibleValue, possibleValueIndex) => {
          const value = attr.toDynamoAssert(possibleValue)
          const possibleVariableName = ':v' + prefix + String(possibleValueIndex)
          possibleVariableNames.push(possibleVariableName)
          values[possibleVariableName] = value
        })

        const possibleVariableNamesStr = possibleVariableNames.join(', ')
        query = `${attrNameMappedTo} IN (${possibleVariableNamesStr})`

        if (operator === 'excludes') {
          query = `NOT (${query})`
        }
        break
      }

      case 'null': {
        query = `${attrNameMappedTo} = :NULL`
        values[':NULL'] = { NULL: true }
        break
      }

      case 'not null': {
        query = `${attrNameMappedTo} = :NOT_NULL`
        values[':NOT_NULL'] = { NULL: false }
        break
      }

      case 'between': {
        if (typeof filter[1] !== 'undefined' && typeof filter[2] !== 'undefined') {
          const lowerVariableName = ':vl' + prefix
          const upperVariableName = ':vu' + prefix
          values[lowerVariableName] = attr.toDynamoAssert(filter[1])
          values[upperVariableName] = attr.toDynamoAssert(filter[2])

          query = `${attrNameMappedTo} BETWEEN ${lowerVariableName} AND ${upperVariableName}`
        } else {
          throw new QueryError('BETWEEN filter missing a lower or upper bound')
        }
        break
      }
    }

    return { values, attrs, query }
  }

  private push(attribute: Attribute<any>, filter: string, operator: FilterOperator): void {
    if (this.isHashKey(attribute)) {
      if (operator === '=') {
        this.keyConditionsMap.push({ attribute, filter })
      } else {
        throw new QueryError(`Cannot use ${operator} for a HASH key, can only use equals (=) operator`)
      }
    } else if (this.isRangeKey(attribute)) {
      if (_.includes(keyConditionAllowedOperators, operator)) {
        this.keyConditionsMap.push({ attribute, filter })
      } else {
        // you also can't put key attributes in the filter expression in DynamoDB, so they need to use a supported operator
        throw new QueryError(`Cannot use ${operator} for a RANGE key, can only use ${keyConditionAllowedOperators.join(', ')} operators`)
      }
    } else {
      this.filterConditions.push(filter)
    }
  }

  private isHashKey(attribute: Attribute<any>): boolean {
    return this.indexMetadata != null && attribute.name === this.indexMetadata.hash.name
  }

  private isRangeKey(attribute: Attribute<any>): boolean {
    if (this.indexMetadata?.range != null) {
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
