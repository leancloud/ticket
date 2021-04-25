const moment = require('moment')

class CreatedAtIs {
  /**
   * @param {number} value
   */
  constructor(value) {
    if (typeof value !== 'number') {
      throw new Error('Invalid number')
    }
    if (value < 0) {
      throw new Error('Value must be a postive number')
    }
    this.value = value
  }

  /**
   * @param {import('../../context').Context} ctx
   */
  _nowDiff(ctx) {
    return moment().diff(ctx.getCreatedAt(), 'hours')
  }

  /**
   * @param {import('../../context').Context} ctx
   */
  test(ctx) {
    return this._nowDiff(ctx) === this.value
  }
}

class CreatedAtLessThan extends CreatedAtIs {
  /**
   * @param {import('../../context').Context} ctx
   */
  test(ctx) {
    return this._nowDiff(ctx) < this.value
  }
}

class CreatedAtGreaterThan extends CreatedAtIs {
  /**
   * @param {import('../../context').Context} ctx
   */
  test(ctx) {
    return this._nowDiff(ctx) > this.value
  }
}

module.exports = { CreatedAtIs, CreatedAtLessThan, CreatedAtGreaterThan }
