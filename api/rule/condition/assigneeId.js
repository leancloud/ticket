class AssigneeIdIs {
  constructor(value) {
    if (typeof value !== 'string') {
      throw new Error('Assignee ID must be a string')
    }
    this.value = value
  }

  test(ctx) {
    if (this.value === '') {
      return ctx.getTicketAssigneeId() === undefined
    }
    return ctx.getTicketAssigneeId() === this.value
  }
}

class AssigneeIdIsNot extends AssigneeIdIs {
  test(ctx) {
    return !super.test(ctx)
  }
}

module.exports = { AssigneeIdIs, AssigneeIdIsNot }
