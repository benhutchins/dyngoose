import { expect } from 'chai'
import { stringToNumber } from 'dyngoose/utils'

describe('AttributeType/Utils', () => {
  describe('stringToNumber', () => {
    it('should convert strings to numbers', () => {
      expect(stringToNumber('1000')).to.eq(1000)
      expect(stringToNumber('1000.50')).to.eq(1000.5)

      // it also accepts numbers and returns them without changing them
      expect(stringToNumber(1000)).to.eq(1000)
      expect(stringToNumber(1000.50)).to.eq(1000.5)
    })
  })
})
