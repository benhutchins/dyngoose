import {
  AttributeValue,
  PutItemOutput,
  UpdateItemOutput,
  TableDescription,
  PutItemCommandOutput,
  UpdateItemCommandOutput,
  DeleteItemCommandOutput,
} from '@aws-sdk/client-dynamodb'
import * as _ from 'lodash'
import { Attribute } from './attribute'
import { DocumentClient } from './document-client'
import * as Events from './events'
import { AttributeMap, SetPropParams, UpdateOperator } from './interfaces'
import { Filters } from './query/filters'
import { MagicSearch, MagicSearchInput } from './query/search'
import { createTable } from './tables/create-table'
import { deleteTable } from './tables/delete-table'
import { describeTable } from './tables/describe-table'
import { migrateTable } from './tables/migrate-table'
import { TableProperties, TableProperty } from './tables/properties'
import { Schema } from './tables/schema'
import { isTrulyEmpty } from './utils/truly-empty'

type StaticThis<T> = new() => T

export class Table {
  // #region static
  // #region static properties
  public static get schema(): Schema {
    if (this.__schema == null) {
      this.__schema = new Schema(this as any)
    }

    return this.__schema
  }

  public static set schema(schema: Schema) {
    this.__schema = schema
  }

  public static get documentClient(): DocumentClient<Table> {
    if (this.__documentClient == null) {
      this.__documentClient = new DocumentClient(this)
    }

    return this.__documentClient
  }

  public static set documentClient(documentClient: DocumentClient<Table>) {
    this.__documentClient = documentClient
  }

  private static __schema: Schema
  private static __documentClient: DocumentClient<any>
  // #endregion static properties

  // #region static methods
  /**
   * Creates a new record for this table.
   *
   * This method is strongly typed and it is recommended you use over `new Table(…)`
   */
  public static new<T extends Table>(this: StaticThis<T>, values?: TableProperties<T>): T {
    const record = new this().applyDefaults()
    if (values != null) {
      record.setValues(values)
    }
    return record
  }

  /**
   * Creates a new instance of Table with values from a given `AttributeMap`.
   *
   * This assumes the record exists in DynamoDB and saving this record will
   * default to using an `UpdateItem` operation rather than a `PutItem` operation
   * upon being saved.
   */
  public static fromDynamo<T extends Table>(this: StaticThis<T>, attributes: AttributeMap, entireDocument = true): T {
    return new this().fromDynamo(attributes, entireDocument)
  }

  /**
   * Creates an instance of Table from raw user input. Designs to be used for creating
   * records from requests, like:
   *
   * express.js:
   *   ```app.post('/api/create', (req, res) => {
   *     const card = Card.fromJSON(req.body)
   *   })```
   *
   * Each attribute can optionally define additional validation logic or sanitization
   * of the user input, @see {@link https://github.com/benhutchins/dyngoose/blob/master/docs/Attributes}.
   */
  public static fromJSON<T extends Table>(this: StaticThis<T>, json: { [attribute: string]: any }): T {
    return new this().applyDefaults().fromJSON(json)
  }

  /**
   * Query DynamoDB for what you need.
   *
   * This is a powerful all-around querying method. It will detect the best index available for use,
   * but it ignores indexes that are not set to Projection of `ALL`. To please use the index-specific
   * querying when necessary.
   *
   * This will avoid performing a scan at all cost, but it will fall back to using a scan if necessary.
   *
   * By default, this returns you one "page" of results (allows DynamoDB) to process and return the
   * maximum of items DynamoDB allows. If you want it to internally page for you to return all possible
   * results (be cautious as that can easily cause timeouts for Lambda), specify `{ all: true }` as an
   * input argument for the second argument.
   */
  public static search<T extends Table>(this: StaticThis<T>, filters?: Filters<T>, input: MagicSearchInput<T> = {}): MagicSearch<T> {
    return new MagicSearch<T>(this as any, filters, input)
  }

  /**
   * Creates the table in DynamoDB.
   *
   * You can also use {@link Table.migrateTable} to create and automatically
   * migrate and indexes that need changes.
   */
  public static async createTable(waitForReady = true): Promise<TableDescription> {
    return await createTable(this.schema, waitForReady)
  }

  /**
   * Migrates the table to match updated specifications.
   *
   * This will create new indexes and delete legacy indexes.
   */
  public static async migrateTable(): Promise<TableDescription> {
    return await migrateTable(this.schema)
  }

  /**
   * Deletes the table from DynamoDB.
   *
   * Be a bit careful with this in production.
   */
  public static async deleteTable(): Promise<TableDescription | undefined> {
    return await deleteTable(this.schema)
  }

  public static async describeTable(): Promise<TableDescription> {
    return await describeTable(this.schema)
  }
  // #endregion static methods
  // #endregion static

  // #region properties
  protected get table(): typeof Table {
    return this.constructor as typeof Table
  }

  // raw storage for all attributes this record (instance) has
  private __attributes: AttributeMap = {}
  private __original: AttributeMap = {}
  private __updatedAttributes: string[] = []
  private __removedAttributes: string[] = []
  private __updateOperators: { [key: string]: UpdateOperator } = {}
  private __putRequired = true // true when this is a new record and a putItem is required, false when updateItem can be used
  private __entireDocumentIsKnown = true
  // #endregion properties

  /**
   * Create a new Table record by attribute names, not property names.
   *
   * @see {@link Table.new} To create a strongly-typed record by property names.
   */
  constructor(values?: { [key: string]: any }) {
    if (values != null) {
      for (const key of Object.keys(values)) {
        this.setAttribute(key, values[key])
      }
    }
  }

  // #region public methods
  /**
   * Apply any default values for attributes.
   */
  public applyDefaults(): this {
    const attributes = this.table.schema.getAttributes()

    for (const [, attribute] of attributes) {
      const defaultValue = attribute.getDefaultValue()
      if (defaultValue != null) {
        this.setByAttribute(attribute, defaultValue)
      }
    }

    return this
  }

  /**
   * Load values from an a AttributeMap into this Table record.
   *
   * This assumes the values are loaded directly from DynamoDB, and after
   * setting the attributes it resets the attributes pending update and
   * deletion.
   */
  public fromDynamo(values: AttributeMap, entireDocument = true): this {
    this.__attributes = values

    // this is an existing record in the database, so when we save it, we need to update
    this.__updatedAttributes = []
    this.__removedAttributes = []
    this.__putRequired = false
    this.__entireDocumentIsKnown = entireDocument

    return this
  }

  /**
   * Converts the current attribute values into a AttributeMap which
   * can be sent directly to DynamoDB within a PutItem, UpdateItem, or similar
   * request.
  */
  public toDynamo(): AttributeMap {
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
  public getDynamoKey(): AttributeMap {
    const hash = this.getAttribute(this.table.schema.primaryKey.hash.name)
    const key: AttributeMap = {
      [this.table.schema.primaryKey.hash.name]: this.table.schema.primaryKey.hash.toDynamoAssert(hash),
    }

    if (this.table.schema.primaryKey.range != null) {
      const range = this.getAttribute(this.table.schema.primaryKey.range.name)
      key[this.table.schema.primaryKey.range.name] = this.table.schema.primaryKey.range.toDynamoAssert(range)
    }

    return key
  }

  /**
   * Get the list of attributes pending update.
   *
   * The result includes attributes that have also been deleted. To get just
   * the list of attributes pending deletion, use {@link Table.getDeletedAttributes}.
   *
   * If you want to easily know if this record has updates pending, use {@link Table.hasChanges}.
   */
  public getUpdatedAttributes(): string[] {
    return this.__updatedAttributes
  }

  /**
   * Get the list of attributes pending deletion.
   *
   * To get all the attributes that have been updated, use {@link Table.getUpdatedAttributes}.
   *
   * If you want to easily know if this record has updates pending, use {@link Table.hasChanges}.
   */
  public getDeletedAttributes(): string[] {
    return this.__removedAttributes
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
  public fromJSON(json: { [attribute: string]: any }, ignoreArbitrary = false): this {
    const blacklist: string[] = this.table.getBlacklist()

    _.each(json, (value: any, propertyName: string) => {
      let attribute: Attribute<any> | undefined

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
        // allow the attribute to transform the value via a custom fromJSON method
        if (!isTrulyEmpty(value) && typeof attribute.type.fromJSON === 'function') {
          value = attribute.type.fromJSON(value)
        }

        const currentValue = this.getAttribute(attribute.name)

        // compare to current value, to avoid unnecessarily marking attributes as needing to be saved
        if (!_.isEqual(currentValue, value)) {
          if (isTrulyEmpty(value)) {
            this.removeAttribute(attribute.name)
          } else {
            this.setByAttribute(attribute, value)
          }
        }
      }
    })

    return this
  }

  /**
   * Returns the AttributeValue value for an attribute.
   *
   * To get the transformed value, use {@link Table.getAttribute}
   */
  public getAttributeDynamoValue(attributeName: string): AttributeValue {
    return this.__attributes[attributeName]
  }

  /**
   * Gets the JavaScript transformed value for an attribute.
   *
   * While you can read values directly on the Table record by its property name,
   * sometimes you need to get attribute.
   *
   * Unlike {@link Table.get}, this excepts the attribute name, not the property name.
   */
  public getAttribute(attributeName: string): any {
    const attribute = this.table.schema.getAttributeByName(attributeName)
    return this.getByAttribute(attribute)
  }

  /**
   * Get the update operator for an attribute.
   */
  public getUpdateOperator(attributeName: string): UpdateOperator {
    return this.__updateOperators[attributeName] ?? 'set'
  }

  /**
   * Set the update operator for an attribute.
   */
  public setAttributeUpdateOperator(attributeName: string, operator: UpdateOperator): this {
    this.__updateOperators[attributeName] = operator
    return this
  }

  /**
   * Sets the AttributeValue for an attribute.
   *
   * To set the value from a JavaScript object, use {@link Table.setAttribute}
  */
  public setAttributeDynamoValue(attributeName: string, attributeValue: AttributeValue): this {
    // save the original value before we update the attributes value
    if (!_.isUndefined(this.__attributes[attributeName]) && _.isUndefined(this.__original[attributeName])) {
      this.__original[attributeName] = this.getAttributeDynamoValue(attributeName)
    }

    // store the new value
    this.__attributes[attributeName] = attributeValue

    // track that this value was updated
    this.__updatedAttributes.push(attributeName)

    // ensure the attribute is not marked for being deleted
    _.pull(this.__removedAttributes, attributeName)

    return this
  }

  /**
   * Sets the value of an attribute by attribute name from a JavaScript object.
   *
   * - To set an attribute value by property name, use {@link Table.set}.
   */
  public setAttribute(attributeName: string, value: any, params?: SetPropParams): this {
    const attribute = this.table.schema.getAttributeByName(attributeName)
    return this.setByAttribute(attribute, value, params)
  }

  /**
   * Sets several attribute values on this record by attribute names.
   *
   * - To set several values by property names, use {@link Table.setValues}.
   * - To set a single attribute value by attribute name, use {@link Table.setAttribute}.
   * - To set a single attribute value by property name, use {@link Table.set}.
   *
   * @param {object} values An object, where the keys are the attribute names,
   *                        and the values are the values you'd like to set.
  */
  public setAttributes(values: { [name: string]: any }): this {
    _.forEach(values, (value, attributeName) => {
      this.setAttribute(attributeName, value)
    })

    return this
  }

  /**
   * Remove a single attribute by its attribute name.
   *
   * Replaced by {@link Table.removeAttribute}.
   * @deprecated Since 3.0.0, will be removed in 4.0.0
   */
  public deleteAttribute(attributeName: string): this {
    return this.removeAttribute(attributeName)
  }

  /**
   * Remove a single attribute by its attribute name.
   *
   * @see {@link Table.remove} Remove an attribute by its property name.
   * @see {@link Table.removeAttributes} Remove several attributes by their property names.
   */
  public removeAttribute(attributeName: string): this {
    // delete the attribute as long as it existed and wasn't already null
    if (!_.isNil(this.__attributes[attributeName]) || !this.__entireDocumentIsKnown) {
      this.__attributes[attributeName] = { NULL: true }
      this.__removedAttributes.push(attributeName)
      _.pull(this.__updatedAttributes, attributeName)
    }
    return this
  }

  /**
   * Mark several attributes to be removed.
   *
   * Replaced by {@link Table.removeAttributes}.
   * @deprecated Since 3.0.0, will be removed in 4.0.0
   */
  public deleteAttributes(attributes: string[]): this {
    return this.removeAttributes(attributes)
  }

  /**
   * Remove several attributes by their property names.
   *
   * @see {@link Table.remove} Remove an attribute by its property name.
   * @see {@link Table.removeAttribute} Remove a single attribute by its attribute name.
   */
  public removeAttributes(attributes: string[]): this {
    for (const attribute of attributes) {
      this.removeAttribute(attribute)
    }
    return this
  }

  /**
   * Sets a value of an attribute by its property name.
   *
   * @see {@link Table.setValues} To set several attribute values by property names.
   * @see {@link Table.setAttribute} To set an attribute value by an attribute name.
   * @see {@link Table.setAttributes} To set several attribute values by attribute names.
   */
  public set<P extends TableProperty<this>>(propertyName: P | string, value: this[P], params?: SetPropParams): this {
    const attribute = this.table.schema.getAttributeByPropertyName(propertyName as string)
    return this.setByAttribute(attribute, value, params)
  }

  /**
   * Gets a value of an attribute by its property name.
   *
   * @see {@link Table.getAttribute} To get a value by an attribute name.
   * @see {@link Table.toJSON} To get the entire record.
   */
  public get<P extends TableProperty<this>>(propertyName: P | string): this[P] {
    const attribute = this.table.schema.getAttributeByPropertyName(propertyName as string)
    return this.getByAttribute(attribute)
  }

  /**
   * Remove an attribute by its property name.
   *
   * Replaced by {@link Table.remove}
   * @deprecated Since 3.0.0, will be removed in 4.0.0
   */
  public del<P extends TableProperty<this>>(propertyName: P | string): this {
    return this.remove(propertyName)
  }

  /**
   * Remove an attribute by its property name.
   *
   * @see {@link Table.removeAttribute} Remove a single attribute by its attribute name.
   * @see {@link Table.removeAttributes} Remove several attributes by their property names.
   */
  public remove<P extends TableProperty<this>>(propertyName: P | string): this {
    const attribute = this.table.schema.getAttributeByPropertyName(propertyName as string)
    return this.removeAttribute(attribute.name)
  }

  /**
   * Update several attribute values on this record by property names.
   *
   * @see {@link Table.set} To set an attribute value by property name.
   * @see {@link Table.setAttribute} To set an attribute value by an attribute names.
   * @see {@link Table.setAttributes} To set several attribute values by attribute names.
   */
  public setValues(values: TableProperties<this>): this {
    for (const key in values) {
      this.set(key as TableProperty<this>, (values as any)[key])
    }

    return this
  }

  /**
   * Determines if this record has any attributes pending an update or deletion.
   */
  public hasChanges(): boolean {
    return this.__updatedAttributes.length > 0 || this.__removedAttributes.length > 0
  }

  /**
   * Return the original values for the record, if it was loaded from DynamoDB.
   */
  public getOriginalValues(): AttributeMap {
    return this.__original
  }

  /**
   * Save this record to DynamoDB.
   *
   * Will check to see if there are changes to the record, if there are none the save request is ignored.
   * To skip this check, use {@link Table.forceSave} instead.
   *
   * Calls the {@link Table.beforeSave} before saving the record.
   * If {@link Table.beforeSave} returns false, the save request is ignored.
   *
   * Automatically determines if the the save should use a PutItem or UpdateItem request.
   */
  public async save(event?: undefined | { returnOutput?: false } & Events.SaveEvent<this>): Promise<void>
  public async save(event: { returnOutput: true, operator?: undefined } & Events.SaveEvent<this>): Promise<PutItemOutput | UpdateItemOutput>
  public async save(event: { returnOutput: true, operator: 'put' } & Events.SaveEvent<this>): Promise<PutItemOutput>
  public async save(event: { returnOutput: true, operator: 'update' } & Events.SaveEvent<this>): Promise<UpdateItemOutput>
  public async save(event?: Events.SaveEvent<this>): Promise<any> {
    const operator = event?.operator ?? this.getSaveOperation()
    const beforeSaveEvent: Events.BeforeSaveEvent<this> = {
      ...event,
      operator,
    }
    const allowSave = await this.beforeSave(beforeSaveEvent)

    if (beforeSaveEvent.force === true || (allowSave !== false && this.hasChanges())) {
      let output: PutItemCommandOutput | UpdateItemCommandOutput
      if (beforeSaveEvent.operator === 'put') {
        output = await this.table.documentClient.put(this, beforeSaveEvent)
        this.__putRequired = false
      } else {
        output = await this.table.documentClient.update(this, beforeSaveEvent)
      }

      // trigger afterSave before clearing values, so the hook can determine what has been changed
      await this.afterSave({
        ...beforeSaveEvent,
        output,
        deletedAttributes: this.__removedAttributes,
        updatedAttributes: this.__updatedAttributes,
      })

      // reset internal tracking of changes attributes
      this.__removedAttributes = []
      this.__updatedAttributes = []

      if (beforeSaveEvent.returnOutput === true) {
        return output
      }
    }
  }

  /**
   * Returns whether this is a newly created record that hasn't been saved
   * It is not a guarantee that the hash key is not already in use
   */
  public isNew(): boolean {
    return this.__putRequired
  }

  /**
   * Determine the best save operation method to use based upon the item's current state
   */
  public getSaveOperation(): 'put' | 'update' {
    let type: 'put' | 'update'
    if (this.__putRequired || !this.hasChanges()) {
      this.__putRequired = false
      type = 'put'
    } else {
      type = 'update'
    }
    return type
  }

  /**
   * Deletes this record from DynamoDB.
   *
   * Before deleting, it will call {@link Table.beforeDelete}. If {@link Table.beforeDelete}
   * returns false then this record will not be deleted.
   *
   * After deleting, {@link Table.afterDelete} will be called.
   */
  public async delete(event?: { returnOutput?: false } & Events.DeleteEvent<this>): Promise<void>
  public async delete(event: { returnOutput: true } & Events.DeleteEvent<this>): Promise<DeleteItemCommandOutput>
  public async delete(event?: Events.DeleteEvent<this>): Promise<any> {
    const beforeDeleteEvent = { ...event }
    const allowDeletion = await this.beforeDelete(beforeDeleteEvent)

    if (allowDeletion) {
      const output = await this.table.documentClient.delete(this, event?.conditions)
      const afterDeleteEvent: Events.AfterDeleteEvent<this> = {
        ...beforeDeleteEvent,
        output,
      }
      await this.afterDelete(afterDeleteEvent)

      if (beforeDeleteEvent.returnOutput === true) {
        return output
      }
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
   * @see {@link https://github.com/benhutchins/dyngoose/blog/master/docs/Attributes.md#custom-attribute-types}.
   */
  public toJSON(): { [key: string]: any } {
    const json: { [key: string]: any } = {}

    for (const [attributeName, attribute] of this.table.schema.getAttributes()) {
      const propertyName = attribute.propertyName
      const value = this.getAttribute(attributeName)

      if (!isTrulyEmpty(value)) {
        if (_.isFunction(attribute.type.toJSON)) {
          json[propertyName] = attribute.type.toJSON(value, attribute)
        } else {
          json[propertyName] = value
        }
      }
    }

    return json
  }
  // #endregion public methods

  // #region protected methods
  protected async beforeSave(event: Events.BeforeSaveEvent<this>): Promise<boolean | undefined> {
    return true
  }

  /**
   * After a record is deleted, this handler is called.
   */
  protected async afterSave(event: Events.AfterSaveEvent<this>): Promise<void> {
    return undefined
  }

  /**
   * Before a record is deleted, this handler is called and if the promise
   * resolves as false, the delete request will be ignored.
   */
  protected async beforeDelete(event: Events.BeforeDeleteEvent<this>): Promise<boolean> {
    return true
  }

  /**
   * After a record is deleted, this handler is called.
   */
  protected async afterDelete(event: Events.AfterDeleteEvent<this>): Promise<void> {
    return undefined
  }

  protected setByAttribute(attribute: Attribute<any>, value: any, params: SetPropParams = {}): this {
    const attributeValue = attribute.toDynamo(value)

    // avoid recording the value if it is unchanged, so we do not send it as an updated value during a save
    if (params.force !== true && !_.isUndefined(this.__attributes[attribute.name]) && _.isEqual(this.__attributes[attribute.name], attributeValue)) {
      return this
    }

    if (attributeValue == null) {
      this.removeAttribute(attribute.name)
    } else {
      this.setAttributeDynamoValue(attribute.name, attributeValue)
      this.setAttributeUpdateOperator(attribute.name, params.operator ?? 'set')
    }

    return this
  }

  protected getByAttribute(attribute: Attribute<any>): any {
    const attributeValue = this.getAttributeDynamoValue(attribute.name)
    const value = attribute.fromDynamo(_.cloneDeep(attributeValue))
    return value
  }

  /**
   * Returns a list of attributes that should not be allowed when Table.fromJSON is used.
   */
  protected static getBlacklist(): string[] {
    const blacklist: string[] = [
      this.schema.primaryKey.hash.name,
    ]

    if (this.schema.primaryKey.range != null) {
      blacklist.push(this.schema.primaryKey.range.name)
    }

    return blacklist
  }
  // #endregion protected methods
}

export interface ITable<T extends Table> {
  schema: Schema
  documentClient: DocumentClient<T>
  new(): T
  fromDynamo: (attributes: AttributeMap, entireDocument?: boolean) => T
}
