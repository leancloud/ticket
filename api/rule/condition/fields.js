const { UpdateTypeIs } = require('./updateType')
const { StatusIs, StatusIsNot } = require('./status')
const { AssigneeIdIs, AssigneeIdIsNot } = require('./assigneeId')
const { TitleContains, TitleNotContains } = require('./title')
const { ContentContains, ContentNotContains } = require('./content')

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
  title: {
    contains: (value) => new TitleContains(value),
    notContains: (value) => new TitleNotContains(value),
  },
  content: {
    contains: (value) => new ContentContains(value),
    notContains: (value) => new ContentNotContains(value),
  },
}
