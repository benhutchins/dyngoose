import { Table } from '../dyngoose'
import { Filter } from './filters'
import { MagicSearch } from './search'

export class Condition<T extends Table, Attr, AttributeValueType> {
  private key: Attr | string
  private _not?: boolean
  private filter: Filter<AttributeValueType>

  constructor(private search: MagicSearch<T>, attributeName: Attr) {
    this.key = attributeName
    return this
  }

  not() {
    this._not = !this._not
    return this
  }

  eq(value: AttributeValueType) {
    if (this._not) {
      this.filter = ['<>', value]
    } else {
      this.filter = ['=', value]
    }
    return this.finalize()
  }

  lt(value: AttributeValueType) {
    if (this._not) {
      this.filter = ['>=', value]
    } else {
      this.filter = ['<', value]
    }
    return this.finalize()
  }

  lte(value: AttributeValueType) {
    if (this._not) {
      this.filter = ['>', value]
    } else {
      this.filter = ['<=', value]
    }
    return this.finalize()
  }

  gt(value: AttributeValueType) {
    if (this._not) {
      this.filter = ['<=', value]
    } else {
      this.filter = ['>', value]
    }
    return this.finalize()
  }

  gte(value: AttributeValueType) {
    if (this._not) {
      this.filter = ['<', value]
    } else {
      this.filter = ['>=', value]
    }
    return this.finalize()
  }

  beginsWith(value: Exclude<AttributeValueType, number>) {
    this.filter = ['beginsWith', value]
    return this.finalize()
  }

  contains(value: AttributeValueType) {
    if (this._not) {
      this.filter = ['not contains', value]
    } else {
      this.filter = ['contains', value]
    }
    return this.finalize()
  }

  exists() {
    if (this._not) {
      this.filter = ['not exists']
    } else {
      this.filter = ['exists']
    }
    return this.finalize()
  }

  includes(...values: AttributeValueType[]) {
    if (this._not) {
      this.filter = ['excludes', values]
    } else {
      this.filter = ['includes', values]
    }
    return this.finalize()
  }

  excludes(...values: AttributeValueType[]) {
    if (this._not) {
      this.filter = ['includes', values]
    } else {
      this.filter = ['excludes', values]
    }
    return this.finalize()
  }

  between(start: AttributeValueType, end: AttributeValueType) {
    this.filter = ['between', start, end]
    return this.finalize()
  }

  private finalize() {
    const key = this.key as any
    this.search.addFilterGroup([
      {
        [key]: this.filter as any, // any is because of the Exclude on beginsWith
      },
    ])

    return this.search
  }
}
