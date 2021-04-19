class ContentContains {
  /**
   * @param {string} value
   */
  constructor(value) {
    if (typeof value !== 'string') {
      throw new Error('Value must be a string')
    }
    this.value = value
  }

  /**
   *
   * @param {import('../context').Context} ctx
   */
  test(ctx) {
    return ctx.getContent().includes(this.value)
  }
}

class ContentNotContains extends ContentContains {
  test(ctx) {
    return !super.test(ctx)
  }
}

module.exports = { ContentContains, ContentNotContains }
