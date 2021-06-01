function assertValueIsValid(value) {
  if (typeof value !== 'string') {
    throw new Error('Value must be a string')
  }
}

module.exports = {
  contains: (value) => {
    assertValueIsValid(value)
    return (ctx) => ctx.ticket.title.includes(value)
  },
  not_contains: (value) => {
    assertValueIsValid(value)
    return (ctx) => !ctx.ticket.title.includes(value)
  },
}
