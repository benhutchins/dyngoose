export interface IRequestOptions {
  abortSignal?: AbortSignal

  /**
   * The maximum time in milliseconds that the connection phase of a request
   * may take before the connection attempt is abandoned.
   */
  requestTimeout?: number
}

/**
 * Return a simplified input object we can provide to dynamo client requests
 */
export function toHttpHandlerOptions(input?: IRequestOptions): IRequestOptions | undefined {
  return {
    abortSignal: input?.abortSignal,
    requestTimeout: input?.requestTimeout,
  }
}
