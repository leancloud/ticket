const { TICKET_ACTION } = require('../../../lib/common')

module.exports = {
  update_assignee_id: (value) => {
    if (typeof value !== 'string') {
      throw new Error('The assignee_id muet ba a string')
    }
    return (ctx) => {
      ctx.ticket.assignee_id = value
    }
  },
  operate: (action) => {
    if (!Object.values(TICKET_ACTION).includes(action)) {
      throw new Error('Invalid action')
    }
    return (ctx) => {
      ctx.ticket.operate(action)
    }
  },
}
