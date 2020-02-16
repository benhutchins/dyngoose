import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import { DocumentClient } from './document-client'
import { createTable } from './tables/create-table'
import { deleteTable } from './tables/delete-table'
import { describeTable } from './tables/describe-table'
import { migrateTable } from './tables/migrate-table'
import { Schema } from './tables/schema'
import { isTrulyEmpty } from './utils/truly-empty'

type StaticThis<T> = new() => T

export class Table {
  //#region static
  //#region static properties
  public static get schema(): Schema {
    if (!this.__schema) {
      this.__schema = new Schema(this as any)
    }

    return this.__schema
  }

  public static set schema(schema: Schema) {
    this.__schema = schema
  }

  public static get documentClient(): DocumentClient<Table> {
    if (!this.__documentClient) {
      this.__documentClient = new DocumentClient(this)
    }

    return this.__documentClient
  }

  public static set documentClient(documentClient: DocumentClient<Table>) {
    this.__documentClient = documentClient
  }

  private static __schema: Schema
  private static __documentClient: DocumentClient<any>
  //#endregion static properties

  //#region static methods
  public static fromDynamo<T extends Table>(this: StaticThis<T>, attributes: DynamoDB.AttributeMap): T {
    return new this().fromDynamo(attributes)
  }

  public static fromJSON<T extends Table>(this: StaticThis<T>, json: { [attribute: string]: any }): T {
    return new this().fromJSON(json)
  }

  public static async createTable(waitForReady = true) {
    return await createTable(this.schema, waitForReady)
  }

  /**
   * Migrate the table to match updated specifications.
   *
   * This will create new indexes and delete legacy indexes.
   */
  public static async migrateTable() {
    return await migrateTable(this.schema)
  }

  public static async deleteTable() {
    return await deleteTable(this.schema)
  }

  public static async describeTable(): Promise<DynamoDB.TableDescription> {
    return await describeTable(this.schema)
  }
  //#endregion static methods
  //#endregion static

  //#region properties
  protected get table(): typeof Table {
    return this.constructor as typeof Table
  }

  // raw storage for all attributes this record (instance) has
  private __attributes: DynamoDB.AttributeMap = {}
  private __original: DynamoDB.AttributeMap = {}
  private __updatedAttributes: string[] = []
  private __deletedAttributes: string[] = []
  private __putRequired = true // true when this is a new record and a putItem is required, false when updateItem can be used
  //#endregion properties

  constructor(values?: { [key: string]: any }) {
    if (values) {
      for (const key of _.keys(values)) {
        this.setAttribute(key, values[key])
      }
    }
  }

  //#region public methods
  public fromDynamo(values: DynamoDB.AttributeMap) {
    this.__attributes = values

    // this is an existing record in the database, so when we save it, we need to update
    this.__updatedAttributes = []
    this.__deletedAttributes = []
    this.__putRequired = false

    return this
  }

  public toDynamo(): DynamoDB.AttributeMap {
    return this.table.schema.toDynamo(this)
  }

  /**
   * Utility to get the DynamoDB.Key for this record
   */
  getDynamoKey(): DynamoDB.Key {
    const hash = this.getAttribute(this.table.schema.primaryKey.hash.name)
    const key: DynamoDB.Key = {
      [this.table.schema.primaryKey.hash.name]: this.table.schema.primaryKey.hash.toDynamoAssert(hash),
    }

    if (this.table.schema.primaryKey.range) {
      const range = this.getAttribute(this.table.schema.primaryKey.range.name)
      key[this.table.schema.primaryKey.range.name] = this.table.schema.primaryKey.range.toDynamoAssert(range)
    }

    return key
  }

  getUpdatedAttributes(): string[] {
    return this.__updatedAttributes
  }

  getDeletedAttributes(): string[] {
    return this.__deletedAttributes
  }

  /**
   * While similar to setAttributes, this method runs the attribute's defined fromJSON
   * methods to help standardize the attribute values as much as possible.
   *
   * @param {any} json A JSON object
   * @param {boolean} ignoreArbitrary Whether arbitrary attributes should be ignored.
   *        When false, new attributes will accept or rejected based on the table's
   *        metadata setting ``allowArbitraryAttributes``.
   *        When true, any non-recognized attribute will be ignored. Useful if you're
   *        passing in raw request body objects or dealing with user input.
   */
  public fromJSON(json: { [attribute: string]: any }, ignoreArbitrary = false) {
    const blacklist: string[] = this.table.getBlacklist()

    _.each(json, (value: any, attributeName: string) => {
      if (!_.includes(blacklist, attributeName)) {
        const attr = this.table.schema.getAttributeByName(attributeName, false)

        if (!attr && ignoreArbitrary) {
          return
        }

        if (attr && _.isFunction(attr.type.fromJSON)) {
          value = attr.type.fromJSON(value)
        }

        const currentValue = this.getAttribute(attributeName)

        if (!_.isEqual(currentValue, value)) {
          if (isTrulyEmpty(value)) {
            this.deleteAttribute(attributeName)
          } else {
            this.setAttribute(attributeName, value)
          }
        }
      }
    })

    return this
  }

  /**
   * Returns the DynamoDB.AttributeValue object
   */
  public getAttributeDynamoValue(attributeName: string): DynamoDB.AttributeValue {
    return this.__attributes[attributeName]
  }

  public getAttribute(attributeName: string) {
    const attributeValue = this.getAttributeDynamoValue(attributeName)
    const attribute = this.table.schema.getAttributeByName(attributeName)
    const value = attribute.fromDynamo(attributeValue)
    return value
  }

  public setAttributeValue(attributeName: string, attributeValue: DynamoDB.AttributeValue) {
    // save the original value before we update the attributes value
    if (!_.isUndefined(this.__attributes[attributeName]) && _.isUndefined(this.__original[attributeName])) {
      this.__original[attributeName] = this.getAttributeDynamoValue(attributeName)
    }

    this.__attributes[attributeName] = attributeValue

    // track that this value was updated
    this.__updatedAttributes.push(attributeName)
    _.pull(this.__deletedAttributes, attributeName)
  }

  public setAttribute(attributeName: string, value: any, force = false) {
    const attribute = this.table.schema.getAttributeByName(attributeName)
    const attributeValue = attribute.toDynamo(value)

    // avoid recording the value if it is unchanged, so we do not send it as an updated value during a save
    if (!force && !_.isUndefined(this.__attributes[attributeName]) && _.isEqual(this.__attributes[attributeName], attributeValue)) {
      return
    }

    if (attributeValue) {
      this.setAttributeValue(attributeName, attributeValue)
    } else {
      this.deleteAttribute(attributeName)
    }
  }

  public setAttributes(attributes: { [name: string]: any }) {
    _.forEach(attributes, (value, name) => {
      this.setAttribute(name, value)
    })
  }

  /**
   * Marks an attribute to be deleted.
   */
  public deleteAttribute(attribute: string) {
    // delete the attribute as long as it existed and wasn't already null
    if (!_.isNil(this.__attributes[attribute])) {
      this.__attributes[attribute] = { NULL: true }
      this.__deletedAttributes.push(attribute)
      _.pull(this.__updatedAttributes, attribute)
    }
  }

  /**
   * Marks several attributes to be deleted.
   */
  public deleteAttributes(attributes: string[]) {
    for (const attribute of attributes) {
      this.deleteAttribute(attribute)
    }
  }

  /** Utility for {@link Table.setAttribute} */
  public set(attributeName: string, value: any) {
    return this.setAttribute(attributeName, value)
  }

  /** Utility for {@link Table.getAttribute} */
  public get(attributeName: string) {
    return this.getAttribute(attributeName)
  }

  /**
   * Determines if this record has any attributes pending an update or deletion
   */
  public hasChanges(): boolean {
    return this.__updatedAttributes.length > 0 || this.__deletedAttributes.length > 0
  }

  /**
   * Gets the unchanged values for the record, if it was loaded from DynamoDB
   */
  public getOriginalValues() {
    return this.__original
  }

  /**
   * Saves this record.
   *
   * Will check to see if there are changes to the record, if there are none the save request is ignored.
   * To skip this check, use {@link Table.forceSave} instead.
   *
   * Calls the {@link Table.beforeSave} before saving the record.
   * If {@link Table.beforeSave} returns false, the save request is ignored.
   *
   * Automatically determines if the the save should use use a PutItem or UpdateItem request.
   */
  public async save(meta?: any): Promise<void> {
    const allowSave = await this.beforeSave(meta)
    if (allowSave && this.hasChanges()) {
      await this.forceSave(meta)
    }
  }

  /**
   * Saves this record without calling beforeSave or considering if there are changed attributes.
   */
  public async forceSave(meta?: any): Promise<void> {
    let output: DynamoDB.PutItemOutput | DynamoDB.UpdateItemOutput
    if (this.__putRequired) {
      output = await this.table.documentClient.put(this)
      this.__putRequired = false
    } else {
      output = await this.table.documentClient.update(this)
    }

    // reset internal tracking of changes attributes
    this.__deletedAttributes = []
    this.__updatedAttributes = []

    await this.afterSave(output, meta)
  }

  /**
   * Deletes this record.
   */
  public async delete(meta?: any): Promise<void> {
    const allowDeletion = await this.beforeDelete(meta)

    if (allowDeletion) {
      const output = await this.table.documentClient.delete(this)
      await this.afterDelete(output, meta)
    }
  }

  public toJSON() {
    const json: any = {}

    for (const [attrName, attribute] of this.table.schema.getAttributes()) {
      const value = this.getAttribute(attrName)

      if (_.isFunction(attribute.type.toJSON)) {
        json[attrName] = attribute.type.toJSON(value, attribute)
      } else {
        json[attrName] = value
      }
    }

    return json
  }
  //#endregion public methods

  protected async beforeSave(meta?: any): Promise<boolean> {
    return true
  }

  /**
   * After a record is deleted, this handler is called.
   */
  protected async afterSave(output: DynamoDB.PutItemOutput | DynamoDB.UpdateItemOutput, meta?: any): Promise<void> {
    return
  }

  /**
   * Before a record is deleted, this handler is called and if the promise
   * resolves as false, the delete request will be ignored.
   */
  protected async beforeDelete(meta?: any): Promise<boolean> {
    return true
  }

  /**
   * After a record is deleted, this handler is called.
   */
  protected async afterDelete(output: DynamoDB.DeleteItemOutput, meta?: any): Promise<void> {
    return
  }

  /**
   * Returns a list of attributes that should not be allowed when Table.fromJSON is used.
   */
  protected static getBlacklist(): string[] {
    const blacklist: string[] = [
      this.schema.primaryKey.hash.name,
    ]

    return blacklist
  }
}

export interface ITable<T extends Table> {
  schema: Schema
  documentClient: DocumentClient<T>
  new(): T
  fromDynamo(attributes: DynamoDB.AttributeMap): T
}
