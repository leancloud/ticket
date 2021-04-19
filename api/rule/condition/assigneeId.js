class AssigneeIdIs {
  constructor(value) {
    if (typeof value !== 'string') {
      throw new Error('Assignee ID must be a string')
    }
    this.value = value
  }

  /**
   *
   * @param {import('../context').Context} ctx
   * @returns
   */
  test(ctx) {
    if (this.value === '') {
      return ctx.getAssigneeId() === undefined
    }
    return ctx.getAssigneeId() === this.value
  }
}

class AssigneeIdIsNot extends AssigneeIdIs {
  test(ctx) {
    return !super.test(ctx)
  }
}

module.exports = { AssigneeIdIs, AssigneeIdIsNot }
