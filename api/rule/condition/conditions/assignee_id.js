function assertValueIsValid(value) {
  if (typeof value !== 'string') {
    throw new Error('Value must be a string')
  }
}

module.exports = {
  is: (value) => {
    assertValueIsValid(value)
    return (ctx) => ctx.ticket.assignee_id === value
  },
  is_not: (value) => {
    assertValueIsValid(value)
    return (ctx) => ctx.ticket.assignee_id !== value
  },
}
