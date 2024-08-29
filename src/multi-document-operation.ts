import type { DynamoDB } from '@aws-sdk/client-dynamodb'

import Config from './config'

/**
 * Base class for utilities that deal with multiple documents, such as BatchGet,
 * BatchWrite, and Transaction.
 */
export class MultiDocumentOperation<ListItem> {
  protected dynamo: DynamoDB
  protected readonly list: ListItem[] = []

  constructor(connection?: DynamoDB) {
    this.dynamo = connection ?? Config.defaultConnection.client
  }

  public setConnection(dynamo: DynamoDB): this {
    this.dynamo = dynamo
    return this
  }

  /**
   * Get the number of operations pending in this batch request
   */
  public getCount(): number {
    return this.list.length
  }

  /**
   * Get the list of pending operation items.
   */
  public getPendingItems(): ListItem[] {
    return this.list
  }
}
