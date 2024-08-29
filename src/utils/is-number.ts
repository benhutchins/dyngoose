export function isNumber(value: any): value is number {
  const type = typeof value
  return type === 'number' || type === 'bigint'
}

