const { assignee_id, content, status, title } = require('../../condition/conditions')

module.exports = {
  ...require('./created_at'),
  ...require('./updated_at'),
  assignee_id,
  content,
  status,
  title,
}
