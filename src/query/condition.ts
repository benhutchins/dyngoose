import { Table } from '../dyngoose'
import { Filter } from './filters'
import { MagicSearch } from './search'

export class Condition<T extends Table, Attr, AttributeValueType> {
  private readonly key: Attr | string
  private _not = false
  private filter: Filter<AttributeValueType>

  constructor(private readonly search: MagicSearch<T>, attributeName: Attr) {
    this.key = attributeName
    return this
  }

  not(): this {
    this._not = !this._not
    return this
  }

  eq(value: AttributeValueType): MagicSearch<T> {
    if (this._not) {
      this.filter = ['<>', value]
    } else {
      this.filter = ['=', value]
    }
    return this.finalize()
  }

  lt(value: AttributeValueType): MagicSearch<T> {
    if (this._not) {
      this.filter = ['>=', value]
    } else {
      this.filter = ['<', value]
    }
    return this.finalize()
  }

  lte(value: AttributeValueType): MagicSearch<T> {
    if (this._not) {
      this.filter = ['>', value]
    } else {
      this.filter = ['<=', value]
    }
    return this.finalize()
  }

  gt(value: AttributeValueType): MagicSearch<T> {
    if (this._not) {
      this.filter = ['<=', value]
    } else {
      this.filter = ['>', value]
    }
    return this.finalize()
  }

  gte(value: AttributeValueType): MagicSearch<T> {
    if (this._not) {
      this.filter = ['<', value]
    } else {
      this.filter = ['>=', value]
    }
    return this.finalize()
  }

  beginsWith(value: Exclude<AttributeValueType, number>): MagicSearch<T> {
    this.filter = ['beginsWith', value]
    return this.finalize()
  }

  contains(value: AttributeValueType): MagicSearch<T> {
    if (this._not) {
      this.filter = ['not contains', value]
    } else {
      this.filter = ['contains', value]
    }
    return this.finalize()
  }

  exists(): MagicSearch<T> {
    if (this._not) {
      this.filter = ['not exists']
    } else {
      this.filter = ['exists']
    }
    return this.finalize()
  }

  includes(...values: AttributeValueType[]): MagicSearch<T> {
    if (this._not) {
      this.filter = ['excludes', values]
    } else {
      this.filter = ['includes', values]
    }
    return this.finalize()
  }

  excludes(...values: AttributeValueType[]): MagicSearch<T> {
    if (this._not) {
      this.filter = ['includes', values]
    } else {
      this.filter = ['excludes', values]
    }
    return this.finalize()
  }

  between(start: AttributeValueType, end: AttributeValueType): MagicSearch<T> {
    this.filter = ['between', start, end]
    return this.finalize()
  }

  null(): MagicSearch<T> {
    if (this._not) {
      this.filter = ['not null']
    } else {
      this.filter = ['null']
    }
    return this.finalize()
  }

  private finalize(): MagicSearch<T> {
    const key = this.key as any
    this.search.addFilterGroup([
      {
        [key]: this.filter as any, // any is because of the Exclude on beginsWith
      },
    ])

    return this.search
  }
}
