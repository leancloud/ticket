const { UpdateTypeIs } = require('./updateType')
const { StatusIs, StatusIsNot } = require('./status')
const { AssigneeIdIs, AssigneeIdIsNot } = require('./assigneeId')

module.exports = {
  updateType: {
    is: (value) => new UpdateTypeIs(value),
  },
  status: {
    is: (value) => new StatusIs(value),
    isNot: (value) => new StatusIsNot(value),
  },
  assigneeId: {
    is: (value) => new AssigneeIdIs(value),
    isNot: (value) => new AssigneeIdIsNot(value),
  },
}
