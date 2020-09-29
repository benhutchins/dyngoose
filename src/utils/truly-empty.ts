import * as _ from 'lodash'

export function isTrulyEmpty(value: any) {
  if (_.isBoolean(value)) {
    return false
  }

  if (_.isDate(value)) {
    return false
  }

  if (_.isNil(value) || value === '') {
    return true
  }

  if (_.isString(value) && _.trim(value).length === 0) {
    return true
  }

  if (_.isNumber(value)) {
    return false
  }

  if (_.isArrayLike(value)) {
    return _.isEmpty(_.filter(value, (v) => v != null))
  }

  if (_.isObjectLike(value)) {
    value = _.pickBy(value, _.identity)
    return _.isEmpty(value)
  }

  return false
}
