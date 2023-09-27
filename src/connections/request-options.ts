export interface IRequestOptions {
  abortSignal?: AbortSignal
}

export function isRequestOptions(value: unknown): value is IRequestOptions {
  return typeof value === 'object' && value != null && 'abortSignal' in value
}
