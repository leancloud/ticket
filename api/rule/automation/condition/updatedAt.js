const moment = require('moment')

class UpdatedAtIs {
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
    return moment().diff(ctx.getUpdatedAt(), 'hours')
  }

  /**
   * @param {import('../../context').Context} ctx
   */
  test(ctx) {
    return this._nowDiff(ctx) === this.value
  }
}

class UpdatedAtLessThan extends UpdatedAtIs {
  /**
   * @param {import('../../context').Context} ctx
   */
  test(ctx) {
    return this._nowDiff(ctx) < this.value
  }
}

class UpdatedAtGreaterThan extends UpdatedAtIs {
  /**
   * @param {import('../../context').Context} ctx
   */
  test(ctx) {
    return this._nowDiff(ctx) > this.value
  }
}

module.exports = { UpdatedAtIs, UpdatedAtLessThan, UpdatedAtGreaterThan }
