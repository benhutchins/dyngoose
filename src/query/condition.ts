import { flatten } from 'lodash'

import type { Table } from '../table'
import type { ContainsType, Filter, IntersectsType,SimpleTypesOnly } from './filters'
import type { MagicSearch } from './search'

export class Condition<T extends Table, Attr, AttributeValueType> {
  private readonly key: Attr | string
  private _not = false
  private filter!: Filter<AttributeValueType>

  constructor(private readonly search: MagicSearch<T>, attributeName: Attr | string) {
    this.key = attributeName
    return this
  }

  not(): this {
    this._not = !this._not
    return this
  }

  /**
   * Equal
   *
   * Works for all data types, including lists and maps.
   * Will look for 100% equality, when performing a search on a list, the docum
   *
   * - If the target attribute of the comparison is of type String, Number, or Binary, then the operator checks for
   *   a absolute match (similar to === in javascript).
   * - If the target attribute of the comparison is a set ("SS", "NS", or "BS"), then the operator evaluates to true if
   *   it finds every item specified and only the items specified (similar to _.isEqual in javascript).
   * - If the target attribute of the comparison is a Map, then the operator evaluates to true if the two objects map
   *   recursively (similar to _.isEqual in javascript).
   */
  eq(value: NonNullable<AttributeValueType>): MagicSearch<T> {
    if (this._not) {
      this.filter = ['<>', value]
    } else {
      this.filter = ['=', value]
    }
    return this.finalize()
  }

  /**
   * Less than
   *
   * Works for String, Number, or Binary (not a set type) attribute.
   * Does not work on sets.
   */
  lt(value: AttributeValueType extends any[] ? never : NonNullable<AttributeValueType>): MagicSearch<T> {
    if (this._not) {
      this.filter = ['>=', value]
    } else {
      this.filter = ['<', value]
    }
    return this.finalize()
  }

  /**
   * Less than or equal
   *
   * Works for String, Number, or Binary (not a set type) attribute.
   * Does not work on sets.
   */
  lte(value: AttributeValueType extends any[] ? never : NonNullable<AttributeValueType>): MagicSearch<T> {
    if (this._not) {
      this.filter = ['>', value]
    } else {
      this.filter = ['<=', value]
    }
    return this.finalize()
  }

  /**
   * Greater than
   *
   * Works for String, Number, or Binary (not a set type) attribute.
   * Does not work on sets.
   */
  gt(value: AttributeValueType extends any[] ? never : NonNullable<AttributeValueType>): MagicSearch<T> {
    if (this._not) {
      this.filter = ['<=', value]
    } else {
      this.filter = ['>', value]
    }
    return this.finalize()
  }

  /**
   * Greater than or equal
   *
   * Works for String, Number, or Binary (not a set type) attribute.
   * Does not work on sets.
   */
  gte(value: AttributeValueType extends any[] ? never : NonNullable<AttributeValueType>): MagicSearch<T> {
    if (this._not) {
      this.filter = ['<', value]
    } else {
      this.filter = ['>=', value]
    }
    return this.finalize()
  }

  /**
   * Checks for a prefix.
   *
   * Only works for String or Binary fields.
   * Does not work for numbers or sets.
   */
  beginsWith(value: AttributeValueType extends any[] ? never : Exclude<AttributeValueType, number>): MagicSearch<T> {
    this.filter = ['beginsWith', value]
    return this.finalize()
  }

  /**
   * Checks for a subsequence, or value in a set.
   *
   * Condition value can contain only be a String, Number, or Binary (not a set type).
   *
   * - If the target attribute of the comparison is of type String, then the operator checks for a substring match.
   * - If the target attribute of the comparison is of type Binary, then the operator looks for a subsequence of the
   *   target that matches the input.
   * - If the target attribute of the comparison is a set ("SS", "NS", or "BS"), then the operator evaluates to true if
   *   it finds an exact match with any member of the set.
   *
   * When using `.not().contains(value)` this checks for the absence of a subsequence, or absence of a value in a set.
   */
  contains(value: ContainsType<AttributeValueType>): MagicSearch<T> {
    if (this._not) {
      this.filter = ['not contains', value as any]
    } else {
      this.filter = ['contains', value as any]
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

  /**
   * Check if the attribute value matches of one of the given values.
   *
   * If the attribute value matches any of the values specified, the expression evaluates to true.
   *
   * Can provide up to 100 values to compare against.
   *
   * Works for String, Number, or Binary (not a set type) attributes. **Note: Does not work on sets.**
   */
  includes(...values: Array<SimpleTypesOnly<AttributeValueType>> | Array<Array<SimpleTypesOnly<AttributeValueType>>>): MagicSearch<T> {
    if (this._not) {
      this.filter = ['excludes', flatten(values)]
    } else {
      this.filter = ['includes', flatten(values)]
    }
    return this.finalize()
  }

  /**
   * Check if the attribute value does NOT match any of the given values.
   *
   * This is a utility method, identical as if you did `.not().includes(…)`
   *
   * Works for String, Number, or Binary (not a set type) attributes. **Note: Does not work on sets.**
   */
  excludes(...values: Array<SimpleTypesOnly<AttributeValueType>>): MagicSearch<T> {
    if (this._not) {
      this.filter = ['includes', flatten(values)]
    } else {
      this.filter = ['excludes', flatten(values)]
    }
    return this.finalize()
  }

  /**
   * Checks if a Set contains any of the provided values in a list.
   *
   * If any of the values specified are contained in the attribute's Set, the expression evaluates to true.
   *
   * Works for StringSet, NumberSet, or BinarySet attributes.
   */
  someOf(...values: Array<IntersectsType<AttributeValueType>> | Array<Array<IntersectsType<AttributeValueType>>>): MagicSearch<T> {
    return this.intersects('some', values)
  }

  /**
   * Checks if a Set contains all of the provided values in a list.
   *
   * If every one of the values are contained with the attribute's Set, the expression evaluates to true.
   *
   * Works for StringSet, NumberSet, or BinarySet attributes.
   */
  allOf(...values: Array<IntersectsType<AttributeValueType>> | Array<Array<IntersectsType<AttributeValueType>>>): MagicSearch<T> {
    return this.intersects('all', values)
  }

  /**
   * Greater than or equal to the first (lower) value, and less than or equal to the second (upper) value.
   *
   * Works for String, Number, or Binary (not a set type) attribute.
   * Does not work on sets.
   */
  between(
    lower: AttributeValueType extends any[] ? never : NonNullable<AttributeValueType>,
    upper: AttributeValueType extends any[] ? never : NonNullable<AttributeValueType>,
  ): MagicSearch<T> {
    this.filter = ['between', lower, upper]
    return this.finalize()
  }

  /**
   * The attribute does not exist.
   *
   * NULL is supported for all data types, including lists and maps.
   */
  null(): MagicSearch<T> {
    if (this._not) {
      this.filter = ['not null']
    } else {
      this.filter = ['null']
    }
    return this.finalize()
  }

  private intersects(allOrSome: 'all' | 'some', values: Array<IntersectsType<AttributeValueType>> | Array<Array<IntersectsType<AttributeValueType>>>): MagicSearch<T> {
    const key = this.key as any
    const filters: any[] = [] // any is because of the Exclude on beginsWith
    const operator: 'contains' | 'not contains' = this._not ? 'not contains' : 'contains'
    const options = flatten(values)

    for (let i = 0; i < options.length; i++) {
      const value = options[i]
      const filter: Filter<AttributeValueType> = [operator, value]
      filters.push({ [key]: filter })

      if (allOrSome === 'some' && i !== options.length - 1) {
        filters.push('OR')
      }
    }

    if (allOrSome === 'some') {
      this.search.parenthesis(group => group.addFilterGroup(filters))
    } else {
      this.search.addFilterGroup(filters)
    }

    return this.search
  }

  private finalize(): MagicSearch<T> {
    const key = this.key as any
    this.search.addFilterGroup([
      {
        [key]: this.filter,
      } as any, // any is because of the Exclude on beginsWith
    ])

    return this.search
  }
}
