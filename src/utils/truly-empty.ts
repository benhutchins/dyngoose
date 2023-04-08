import * as _ from 'lodash'

export function isTrulyEmpty(value: any): boolean {
  if (typeof value === 'boolean') {
    return false
  }

  if (_.isDate(value)) {
    return false
  }

  if (value == null || value === '') {
    return true
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return true
  }

  if (typeof value === 'number') {
    return false
  }

  if (_.isSet(value)) {
    return _.isEmpty(_.filter(Array.from(value), (v) => v != null))
  }

  if (_.isArrayLike(value)) {
    return _.isEmpty(_.filter(value, (v) => v != null))
  }

  if (_.isObjectLike(value)) {
    value = _.omitBy(value, isTrulyEmpty)
    return _.isEmpty(value)
  }

  return false
}
