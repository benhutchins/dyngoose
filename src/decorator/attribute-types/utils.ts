export function stringToNumber(number: number | string): number {
  if (typeof number === 'number') {
    return number
  } else {
    return JSON.parse(number)
  }
}

export function numberToString(number: number | BigInt) {
  return number.toString()
}
