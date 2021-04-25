const _ = require('lodash')

const { TICKET_STATUS } = require('../../../lib/common')

class StatusIs {
  constructor(value) {
    if (typeof value !== 'number') {
      throw new Error('Status must be a number')
    }
    if (!(value in _.invert(TICKET_STATUS))) {
      throw new Error('Invalid status')
    }
    this.value = value
  }

  /**
   *
   * @param {import('../context').Context} ctx
   * @returns
   */
  test(ctx) {
    return ctx.getStatus() === this.value
  }
}

class StatusIsNot extends StatusIs {
  test(ctx) {
    return !super.test(ctx)
  }
}

module.exports = { StatusIs, StatusIsNot }
