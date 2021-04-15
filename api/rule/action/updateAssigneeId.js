class UpdateAssigneeId {
  /**
   * @param {string} value
   */
  constructor(value) {
    if (typeof value !== 'string') {
      throw new Error('Assignee ID must be a string')
    }
    this.value = value
  }

  /**
   * @param {import('../context').Context} ctx
   */
  exec(ctx) {
    ctx.setTicketAssigneeId(this.value)
  }
}

module.exports = { UpdateAssigneeId }
