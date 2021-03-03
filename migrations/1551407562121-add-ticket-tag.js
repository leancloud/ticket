'use strict'
const AV = require('leanengine')

module.exports.up = function (next) {
  return new AV.Object('TagMetadata', {
    key: 'testTag',
    values: ['value1', 'value2'],
    type: 'select',
    isPrivate: true,
  })
    .save(null, { useMasterKey: true })
    .then((m) => {
      return m.destroy()
    })
    .then(() => {
      const ticket = new AV.Object('Ticket', {
        privateTags: [],
        tags: [],
      })
      ticket.disableBeforeHook()
      ticket.disableAfterHook()
      return ticket
        .save(null, { useMasterKey: true })
        .then(() => {
          return ticket.destroy()
        })
        .then(() => {
          return next()
        })
        .catch((err) => {
          return next(err)
        })
    })
}

module.exports.down = function (next) {
  next()
}
