class TitleContains {
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
   * @param {import('../context').Context} ctx
   */
  test(ctx) {
    return ctx.getTitle().includes(this.value)
  }
}

class TitleNotContains extends TitleContains {
  test(ctx) {
    return !super.test(ctx)
  }
}

module.exports = { TitleContains, TitleNotContains }
