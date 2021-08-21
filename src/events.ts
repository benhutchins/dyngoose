import { DynamoDB } from 'aws-sdk'
import { Table } from './table'
import { DynamoReturnValues } from './interfaces'
import { UpdateConditions } from './query/filters'

interface BaseEvent<T extends Table> {
  /**
   * Specify a set of conditions which will be converted to a ConditionExpression.
   * You can use the same format you use for Dyngoose queries.
   *
   * @example
   * {
   *   someProperty: ['not exists'],
   *   otherProperty: 'is currently set to this exact string value',
   *   number: ['>', 10],
   * }
   */
  conditions?: UpdateConditions<T>

  /**
   * Optional metadata for the action, passed along to the before and after methods.
   */
  meta?: any
}

export interface SaveEvent<T extends Table> extends BaseEvent<T> {
  /**
   * Specify a value for the ReturnValues parameter.
   *
   * * ``NONE`` - If ReturnValues is not specified, or if its value is NONE, then nothing is returned (default).
   * * ``ALL_OLD`` - Returns all of the attributes of the item, as they appeared before the UpdateItem operation.
   * * ``UPDATED_OLD`` - Returns only the updated attributes, as they appeared before the UpdateItem operation.
   * * ``ALL_NEW`` - Returns all of the attributes of the item, as they appear after the UpdateItem operation.
   * * ``UPDATED_NEW`` - Returns only the updated attributes, as they appear after the UpdateItem operation.
   */
  returnValues?: DynamoReturnValues

  returnConsumedCapacity?: DynamoDB.ReturnConsumedCapacity

  /**
   * Operationally set the save operator.
   * The default logic will use:
   *  * ``put`` for new items, calling a PutItem operation.
   *  * ``update`` for existing items, to only manipulate the desires attributes via an UpdateItem operation.
   */
  operator?: 'put' | 'update'

  /**
   * When true, Dyngoose will return the DynamoDB operation output
   */
  returnOutput?: boolean

  /**
   * By default, there two things which can prevent Dyngoose from saving:
   * 1. Dyngoose calls out to a beforeSave handler on the class which has the
   *    opportunity to cancel the save logic manipulate the data before saving.
   * 2. If there are no known changes to the document, the save operation is cancelled.
   *
   * Setting this to true will ignore the beforeSave handler's response.
  */
  force?: boolean
}

export interface BeforeSaveEvent<T extends Table> extends SaveEvent<T> {
  operator: 'put' | 'update'
}

export interface AfterSaveEvent<T extends Table> extends BeforeSaveEvent<T> {
  output: DynamoDB.PutItemOutput | DynamoDB.UpdateItemOutput
  deletedAttributes: string[]
  updatedAttributes: string[]
}

export interface DeleteEvent<T extends Table> extends BaseEvent<T> {
  /**
   * When true, Dyngoose will return the DynamoDB operation output
   */
  returnOutput?: boolean
}

export interface BeforeDeleteEvent<T extends Table> extends DeleteEvent<T> {
}

export interface AfterDeleteEvent<T extends Table> extends BeforeDeleteEvent<T> {
  output: DynamoDB.DeleteItemOutput
}
