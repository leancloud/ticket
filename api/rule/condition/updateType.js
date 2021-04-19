class UpdateTypeIs {
  constructor(value) {
    const values = ['create', 'update']
    if (!values.includes(value)) {
      throw new Error('Value must be one of ' + values.join(','))
    }
    this.value = value
  }

  test(ctx) {
    return ctx.updateType === this.value
  }
}

module.exports = { UpdateTypeIs }
