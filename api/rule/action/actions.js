const { TICKET_ACTION } = require('../../../lib/common')

module.exports = {
  update_assignee_id: (id) => {
    if (typeof id !== 'string') {
      throw new Error('The assignee_id muet ba a string')
    }
    if (id === '(current user)') {
      return (ctx) => {
        ctx.ticket.assignee_id = ctx.operator_id
      }
    }
    return (ctx) => {
      ctx.ticket.assignee_id = id
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
