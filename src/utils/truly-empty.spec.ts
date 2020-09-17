import { expect } from 'chai'
import { isTrulyEmpty } from './truly-empty'

describe('utils/empty', () => {
  describe('isTrulyEmpty', () => {
    it('nil', () => {
      expect(isTrulyEmpty(null)).to.eq(true)
      expect(isTrulyEmpty(undefined)).to.eq(true)
    })

    it('booleans', () => {
      expect(isTrulyEmpty(true)).to.eq(false)
      expect(isTrulyEmpty(false)).to.eq(false)
    })

    it('dates', () => {
      expect(isTrulyEmpty(new Date())).to.eq(false)
      expect(isTrulyEmpty(new Date(0))).to.eq(false)
    })

    it('strings', () => {
      expect(isTrulyEmpty('')).to.eq(true)
      expect(isTrulyEmpty(' ')).to.eq(true)
      expect(isTrulyEmpty('a')).to.eq(false)
    })

    it('numbers', () => {
      expect(isTrulyEmpty(0)).to.eq(false)
      expect(isTrulyEmpty(0.0)).to.eq(false)
      expect(isTrulyEmpty(100.500)).to.eq(false)
    })

    it('objects', () => {
      expect(isTrulyEmpty({})).to.eq(true)
      expect(isTrulyEmpty({ a: undefined })).to.eq(true)
      expect(isTrulyEmpty({ a: true })).to.eq(false)
    })

    it('arrays', () => {
      expect(isTrulyEmpty([])).to.eq(true)
      expect(isTrulyEmpty([null])).to.eq(true)
      expect(isTrulyEmpty([true])).to.eq(false)
      expect(isTrulyEmpty([false])).to.eq(false)
    })
  })
})
