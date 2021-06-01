const { assignee_id, content, status, title } = require('../../condition/conditions')

module.exports = {
  assignee_id,
  content,
  status,
  title,
  created_at: require('./created_at'),
  updated_at: require('./updated_at'),
}
