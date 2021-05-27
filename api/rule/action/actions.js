module.exports = {
  update_assignee_id: (value) => {
    if (typeof value !== 'string') {
      throw new Error('The assignee_id muet ba a string')
    }
    return (ctx) => {
      ctx.ticket.assignee_id = value
    }
  },
}
