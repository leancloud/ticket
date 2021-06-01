module.exports = {
  is: (value) => {
    if (value !== 'create' && value !== 'update') {
      throw new Error('Value must be "create" or "update"')
    }
    return (ctx) => ctx.update_type === value
  },
}
