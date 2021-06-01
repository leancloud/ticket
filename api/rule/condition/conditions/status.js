const _ = require('lodash')

const { TICKET_STATUS } = require('../../../../lib/common')

function assertValueIsValid(value) {
  if (typeof value !== 'number') {
    throw new Error('Value must be a number')
  }
  if (!(value in _.invert(TICKET_STATUS))) {
    throw new Error('Invalid value')
  }
}

module.exports = {
  is: (value) => {
    assertValueIsValid(value)
    return (ctx) => ctx.ticket.status === value
  },
  is_not: (value) => {
    assertValueIsValid(value)
    return (ctx) => ctx.ticket.status !== value
  },
}
