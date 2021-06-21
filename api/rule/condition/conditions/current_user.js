const { isCustomerService } = require('../../../customerService/utils')

function assertValueIsValid(value) {
  if (typeof value !== 'string') {
    throw new Error('Value must be a string')
  }
}

module.exports = {
  is: (id) => {
    assertValueIsValid(id)
    if (id === '(customer service)') {
      return (ctx) => {
        return isCustomerService(ctx.operator_id)
      }
    }
    return (ctx) => ctx.operator_id === id
  },
  is_not: (id) => {
    assertValueIsValid(id)
    if (id === '(customer service)') {
      return async (ctx) => {
        return !(await isCustomerService(ctx.operator_id))
      }
    }
    return (ctx) => ctx.operator_id !== id
  },
}
