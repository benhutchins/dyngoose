import { DynamoDB } from 'aws-sdk'
import * as _ from 'lodash'
import { Attribute } from './attribute'
import { DocumentClient } from './document-client'
import { Filters as QueryFilters } from './query/filters'
import { Results as QueryResults } from './query/results'
import { MagicSearch, MagicSearchInput } from './query/search'
import { createTable } from './tables/create-table'
import { deleteTable } from './tables/delete-table'
import { describeTable } from './tables/describe-table'
import { migrateTable } from './tables/migrate-table'
import { Schema } from './tables/schema'
import { isTrulyEmpty } from './utils/truly-empty'

type StaticThis<T> = new() => T
type TableProperties<T> = {
  [key in Exclude<Exclude<keyof T, keyof Table>, Function>]?: T[key]
}

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
  public static new<T extends Table>(this: StaticThis<T>, values: TableProperties<T>): T {
    return new this().setValues(values)
  }

  public static fromDynamo<T extends Table>(this: StaticThis<T>, attributes: DynamoDB.AttributeMap): T {
    return new this().fromDynamo(attributes)
  }

  public static fromJSON<T extends Table>(this: StaticThis<T>, json: { [attribute: string]: any }): T {
    return new this().fromJSON(json)
  }

  /**
   * Query DynamoDB for what you need.
   *
   * This is a powerful all-around querying method. It will detect the best index available for use,
   * but it ignores indexes that are not set to Projection of 'ALL'. To please use the index-specific
   * querying when necessary.
   *
   * This will avoid performing a scan at all cost, but it will fall back to using a scan if necessary.
   *
   * By default, this returns you one "page" of results (allows DynamoDB) to process and return the
   * maximum of items DynamoDB allows. If you want it to internally page for you to return all possible
   * results (be cautious as that can easily cause timeouts for Lambda), specify `{ all: true }` as an
   * input argument for the second argument.
   */
  public static async search<T extends Table>(this: StaticThis<T>, filters: QueryFilters<T>, input: MagicSearchInput = {}):
    Promise<QueryResults<T>> {
    const searchHelper = new MagicSearch<T>(this as any, filters, input)
    return searchHelper.search()
  }

  /**
   * Create the table in DynamoDB.
   *
   * You can also use {@link Table.migrateTable} to create and automatically
   * migrate and indexes that need changes.
   */
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

  /**
   * Deletes the table from DynamoDB.
   *
   * Be a bit careful with this in production.
   */
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

  /**
   * Create a new Table record by attribute names, not property names.
   *
   * To create a strongly-typed record by property names, use {@link Table.new}.
  */
  constructor(values?: { [key: string]: any }) {
    if (values) {
      for (const key of _.keys(values)) {
        this.setAttribute(key, values[key])
      }
    }
  }

  //#region public methods
  /**
   * Load values from an a DynamoDB.AttributeMap into this Table record.
   *
   * This assumes the values are loaded directly from DynamoDB, and after
   * setting the attributes it resets the attributes pending update and
   * deletion.
   */
  public fromDynamo(values: DynamoDB.AttributeMap) {
    this.__attributes = values

    // this is an existing record in the database, so when we save it, we need to update
    this.__updatedAttributes = []
    this.__deletedAttributes = []
    this.__putRequired = false

    return this
  }

  /**
   * Converts the current attribute values into a DynamoDB.AttributeMap which
   * can be sent directly to DynamoDB within a PutItem, UpdateItem, or similar
   * request.
  */
  public toDynamo(): DynamoDB.AttributeMap {
    // anytime toDynamo is called, it can generate new default values or manipulate values
    // this keeps the record in sync, so the instance can be used after the record is saved
    const attributeMap = this.table.schema.toDynamo(this)

    for (const attributeName of Object.keys(attributeMap)) {
      if (!_.isEqual(this.__attributes[attributeName], attributeMap[attributeName])) {
        this.__updatedAttributes.push(attributeName)
      }
    }

    this.__attributes = attributeMap
    return this.__attributes
  }

  /**
   * Get the DynamoDB.Key for this record.
   */
  public getDynamoKey(): DynamoDB.Key {
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

  /**
   * Get the list of attributes pending update.
   *
   * The result includes attributes that have also been deleted. To get just
   * the list of attributes pending deletion, use {@link this.getDeletedAttributes}.
   *
   * If you want to easily know if this record has updates pending, use {@link this.hasChanges}.
   */
  public getUpdatedAttributes(): string[] {
    return this.__updatedAttributes
  }

  /**
   * Get the list of attributes pending deletion.
   *
   * To get all the attributes that have been updated, use {@link this.getUpdatedAttributes}.
   *
   * If you want to easily know if this record has updates pending, use {@link this.hasChanges}.
   */
  public getDeletedAttributes(): string[] {
    return this.__deletedAttributes
  }

  /**
   * While similar to setAttributes, this method runs the attribute's defined fromJSON
   * methods to help standardize the attribute values as much as possible.
   *
   * @param {any} json A JSON object
   * @param {boolean} [ignoreArbitrary] Whether arbitrary attributes should be ignored.
   *        When false, unknown attributes will result in an error being thrown.
   *        When true, any non-recognized attribute will be ignored. Useful if you're
   *        passing in raw request body objects or dealing with user input.
   *        Defaults to false.
   */
  public fromJSON(json: { [attribute: string]: any }, ignoreArbitrary = false) {
    const blacklist: string[] = this.table.getBlacklist()

    _.each(json, (value: any, propertyName: string) => {
      let attribute: Attribute<any> | void

      try {
        attribute = this.table.schema.getAttributeByPropertyName(propertyName)
      } catch (ex) {
        if (ignoreArbitrary) {
          return
        } else {
          throw ex
        }
      }

      if (!_.includes(blacklist, attribute.name)) {
        if (typeof attribute.type.fromJSON === 'function') {
          value = attribute.type.fromJSON(value)
        }

        const currentValue = this.getAttribute(attribute.name)

        // compare to current value, to avoid unnecessarily marking attributes as needing to be saved
        if (!_.isEqual(currentValue, value)) {
          if (isTrulyEmpty(value)) {
            this.deleteAttribute(attribute.name)
          } else {
            this.setByAttribute(attribute, value)
          }
        }
      }
    })

    return this
  }

  /**
   * Returns the DynamoDB.AttributeValue value for an attribute.
   *
   * To get the transformed value, use {@link this.getAttribute}
   */
  public getAttributeDynamoValue(attributeName: string): DynamoDB.AttributeValue {
    return this.__attributes[attributeName]
  }

  /**
   * Gets the JavaScript transformed value for an attribute.
   *
   * While you can read values directly on the Table record by it's property name,
   * sometimes you need to get attribute.
   *
   * Unlike {@link this.get}, this excepts the attribute name, not the property name.
   */
  public getAttribute(attributeName: string) {
    const attribute = this.table.schema.getAttributeByName(attributeName)
    return this.getByAttribute(attribute)
  }

  /**
   * Sets the DynamoDB.AttributeValue for an attribute.
   *
   * To set the value from a JavaScript object, use {@link this.setAttribute}
  */
  public setAttributeDynamoValue(attributeName: string, attributeValue: DynamoDB.AttributeValue) {
    // save the original value before we update the attributes value
    if (!_.isUndefined(this.__attributes[attributeName]) && _.isUndefined(this.__original[attributeName])) {
      this.__original[attributeName] = this.getAttributeDynamoValue(attributeName)
    }

    this.__attributes[attributeName] = attributeValue

    // track that this value was updated
    this.__updatedAttributes.push(attributeName)
    _.pull(this.__deletedAttributes, attributeName)
    return this
  }

  /**
   * Sets the value of an attribute by attribute name from a JavaScript object.
   *
   * - To set an attribute value by property name, use {@link this.set}.
   */
  public setAttribute(attributeName: string, value: any, force = false) {
    const attribute = this.table.schema.getAttributeByName(attributeName)
    return this.setByAttribute(attribute, value)
  }

  /**
   * Sets several attribute values on this record by attribute names.
   *
   * - To set several values by property names, use {@link this.setValues}.
   * - To set a single attribute value by attribute name, use {@link this.setAttribute}.
   * - To set a single attribute value by property name, use {@link this.set}.
   *
   * @param {object} values An object, where the keys are the attribute names,
   *                        and the values are the values you'd like to set.
  */
  public setAttributes(values: { [name: string]: any }) {
    _.forEach(values, (value, attributeName) => {
      this.setAttribute(attributeName, value)
    })

    return this
  }

  /**
   * Marks an attribute to be deleted.
   */
  public deleteAttribute(attributeName: string) {
    // delete the attribute as long as it existed and wasn't already null
    if (!_.isNil(this.__attributes[attributeName])) {
      this.__attributes[attributeName] = { NULL: true }
      this.__deletedAttributes.push(attributeName)
      _.pull(this.__updatedAttributes, attributeName)
    }
    return this
  }

  /**
   * Marks several attributes to be deleted.
   */
  public deleteAttributes(attributes: string[]) {
    for (const attribute of attributes) {
      this.deleteAttribute(attribute)
    }
    return this
  }

  /**
   * Sets a value of an attribute by it's property name.
   *
   * - To set several attribute values by property names, use {@link this.setValues}.
   * - To set an attribute value by an attribute name, use {@link this.setAttribute}.
   * - To set several attribute values by attribute names, use {@link this.setAttributes}.
   */
  public set(propertyName: string, value: any) {
    const attribute = this.table.schema.getAttributeByPropertyName(propertyName)
    return this.setByAttribute(attribute, value)
  }

  /**
   * Gets a value of an attribute by it's property name.
   *
   * - To get a value by an attribute name, use {@link this.getAttribute}.
   * - To get the entire record, use {@link this.toJSON}.
   */
  public get(propertyName: string) {
    const attribute = this.table.schema.getAttributeByPropertyName(propertyName)
    return this.getByAttribute(attribute)
  }

  /**
   * Sets several attribute values on this record by property names.
   *
   * - To set an attribute value by property name, use {@link this.set}.
   * - To set an attribute value by an attribute names, use {@link this.setAttribute}.
   * - To set several attribute values by attribute names, use {@link this.setAttributes}.
   */
  public setValues(values: TableProperties<this>) {
    for (const key of _.keys(values)) {
      this.set(key, _.get(values, key))
    }

    return this
  }

  /**
   * Determines if this record has any attributes pending an update or deletion.
   */
  public hasChanges(): boolean {
    return this.__updatedAttributes.length > 0 || this.__deletedAttributes.length > 0
  }

  /**
   * Return the original values for the record, if it was loaded from DynamoDB.
   */
  public getOriginalValues() {
    return this.__original
  }

  /**
   * Save this record to DynamoDB.
   *
   * Will check to see if there are changes to the record, if there are none the save request is ignored.
   * To skip this check, use {@link this.forceSave} instead.
   *
   * Calls the {@link this.beforeSave} before saving the record.
   * If {@link this.beforeSave} returns false, the save request is ignored.
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
   *
   * Most of the time, you should use {@link this.save} instead.
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
   * Deletes this record from DynamoDB.
   *
   * Before deleting, it will call {@link this.beforeDelete}. If {@link this.beforeDelete}
   * returns false then this record will not be deleted.
   *
   * After deleting, {@link this.afterDelete} will be called.
   *
   * @param {any} meta Optional metadata for the action, passed to {@link this.beforeDelete}
   *                   and {@link this.afterDelete}.
   */
  public async delete(meta?: any): Promise<void> {
    const allowDeletion = await this.beforeDelete(meta)

    if (allowDeletion) {
      const output = await this.table.documentClient.delete(this)
      await this.afterDelete(output, meta)
    }
  }

  /**
   * Convert this record to a JSON-exportable object.
   *
   * Has no consideration for "views" or "permissions", so all attributes
   * will be exported.
   *
   * Export object uses the property names as the object keys. To convert
   * a JSON object back into a Table record, use {@link Table.fromJSON}.
   *
   * Each attribute type can define a custom toJSON and fromJSON method,
   * @see {@link https://github.com/benhutchins/dyngoose/wiki/Attributes#custom-attribute-types}.
   */
  public toJSON() {
    const json: any = {}

    for (const [attributeName, attribute] of this.table.schema.getAttributes()) {
      const propertyName = attribute.propertyName
      const value = this.getAttribute(attributeName)

      if (_.isFunction(attribute.type.toJSON)) {
        json[propertyName] = attribute.type.toJSON(value, attribute)
      } else {
        json[propertyName] = value
      }
    }

    return json
  }
  //#endregion public methods

  //#region protected methods
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

  protected setByAttribute(attribute: Attribute<any>, value: any, force = false) {
    const attributeValue = attribute.toDynamo(value)

    // avoid recording the value if it is unchanged, so we do not send it as an updated value during a save
    if (!force && !_.isUndefined(this.__attributes[attribute.name]) && _.isEqual(this.__attributes[attribute.name], attributeValue)) {
      return
    }

    if (attributeValue) {
      this.setAttributeDynamoValue(attribute.name, attributeValue)
    } else {
      this.deleteAttribute(attribute.name)
    }

    return this
  }

  protected getByAttribute(attribute: Attribute<any>) {
    const attributeValue = this.getAttributeDynamoValue(attribute.name)
    const value = attribute.fromDynamo(attributeValue)
    return value
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
  //#endregion protected methods
}

export interface ITable<T extends Table> {
  schema: Schema
  documentClient: DocumentClient<T>
  new(): T
  fromDynamo(attributes: DynamoDB.AttributeMap): T
}
