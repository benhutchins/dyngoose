export function stringToNumber(number: string): number {
  return JSON.parse(number)
}

export function numberToString(number: number | BigInt) {
  return number.toString()
}

export function transformString(value: string) {
  // if (!this.dynamoTypes.includes(AttributeType.Boolean) && !_.isString(value)) {
  //   if (_.isNil(value)) {
  //     value = ''
  //   } else {
  //     value = value.toString()
  //   }
  // }

  if (this.options.trim) {
    value = value.trim()
  }

  if (this.options.lowercase) {
    value = value.toLowerCase()
  }

  if (this.options.uppercase) {
    value = value.toUpperCase()
  }

  return value
}
