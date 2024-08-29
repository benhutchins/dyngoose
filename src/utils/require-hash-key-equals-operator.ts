import { isArray } from 'lodash'

import { QueryError } from '../errors'
import type { Filters } from '../query/filters'
import type { Table } from '../table'

export function requireHashKeyEqualsOperator<T extends Table>(filters: Filters<T>, propertyName: string): void {
  const hashPropertyName = propertyName as keyof typeof filters

  if (filters?.[hashPropertyName] == null) {
    throw new QueryError('Cannot perform a query on the PrimaryKey Index or a GlobalSecondaryIndex without specifying a hash key value')
  } else if (isArray(filters[hashPropertyName]) && filters[hashPropertyName][0] !== '=') {
    throw new QueryError('DynamoDB only supports using equal operator for the HASH key')
  }
}
