import { UpdateOperator } from './update-operator.interface'

export interface SetPropParams {
  /**
   * Manually specify the update operator to be used during the UpdateItem call.
   * This is only available when performing an update and is ignored when calling
   * a PutItem operation on new items.
   */
  operator?: UpdateOperator

  /**
   * By default, Dyngoose will not override an attribute if the value does not
   * appear to have changed. This will ensure we do not attempt to perform
   * wasteful Set operations during the UpdateItem call.
   *
   * If for some reason this logic does not work for you, setting force to true
   * will ensure the change is passed along with the UpdateItem call.
   */
  force?: boolean
}
