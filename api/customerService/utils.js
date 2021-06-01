const AV = require('leancloud-storage')

const cache = require('../utils/cache')

function fetchCustomerServiceRole() {
  return new AV.Query(AV.Role).equalTo('name', 'customerService').first()
}

function getCustomerServiceRole() {
  return cache.get('role:customerService', fetchCustomerServiceRole, 1000 * 60 * 10)
}

/**
 * @param {string | AV.User} user
 */
async function isCustomerService(user) {
  const userId = typeof user === 'string' ? user : user.id
  const role = await getCustomerServiceRole()
  const query = role.getUsers().query().equalTo('objectId', userId).select('objectId')
  return !!(await query.first({ useMasterKey: true }))
}

module.exports = { getCustomerServiceRole, isCustomerService }
