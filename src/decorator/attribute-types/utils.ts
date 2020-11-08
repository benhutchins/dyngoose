export function stringToNumber(number: number | string): number {
  if (typeof number === 'number') {
    return number
  } else {
    return JSON.parse(number)
  }
}

export function numberToString(number: number | BigInt): string {
  return number.toString()
}

export function isNumber(value: any): value is number {
  const type = typeof value
  return type === 'number' || type === 'bigint'
}
