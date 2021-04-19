const { UpdateAssigneeId } = require('./updateAssigneeId')

module.exports = {
  updateAssigneeId: (value) => new UpdateAssigneeId(value),
}
