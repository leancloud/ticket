const { assigneeId, status, title, content } = require('../../condition/fields')
const { CreatedAtIs, CreatedAtLessThan, CreatedAtGreaterThan } = require('./createdAt')
const { UpdatedAtIs, UpdatedAtLessThan, UpdatedAtGreaterThan } = require('./updatedAt')

module.exports = {
  assigneeId,
  status,
  title,
  content,
  createdAt: {
    is: (value) => new CreatedAtIs(value),
    lessThan: (value) => new CreatedAtLessThan(value),
    greaterThan: (value) => new CreatedAtGreaterThan(value),
  },
  updatedAt: {
    is: (value) => new UpdatedAtIs(value),
    lessThan: (value) => new UpdatedAtLessThan(value),
    greaterThan: (value) => new UpdatedAtGreaterThan(value),
  },
}
