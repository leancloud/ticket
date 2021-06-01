const moment = require('moment')

function assertValueIsValid(value) {
  if (typeof value !== 'number' || value < 0) {
    throw new Error('Value must be a postive number')
  }
}

module.exports = {
  is: (value) => {
    assertValueIsValid(value)
    return (ctx) => {
      return moment().diff(ctx.ticket.updated_at, 'hour') === value
    }
  },
  less_than: (value) => {
    assertValueIsValid(value)
    return (ctx) => {
      return moment().diff(ctx.ticket.updated_at, 'hour') < value
    }
  },
  greater_than: (value) => {
    assertValueIsValid(value)
    return (ctx) => {
      return moment().diff(ctx.ticket.updated_at, 'hour') > value
    }
  },
}
