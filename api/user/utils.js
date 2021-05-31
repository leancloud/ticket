const AV = require('leancloud-storage')

const systemUser = AV.Object.createWithoutData('_User', 'system')
// 不要通过 set 方法设置属性, 不然会被保存
systemUser.attributes.username = 'system'

/**
 * @param {import('leancloud-storage').User} user
 * @param {object} [options]
 */
function encodeUserObject(user) {
  return {
    id: user.id,
    nid: user.get('nid'),
    email: user.get('email') || '',
    username: user.get('username'),
    name: user.get('name') || '',
    tags: user.get('tags') || [],
    created_at: user.createdAt,
  }
}

/**
 * @param {AV.Object} user
 */
function makeTinyUserInfo(user) {
  return {
    objectId: user.id,
    username: user.get('username'),
    name: user.get('name'),
    email: user.get('email'),
  }
}

/**
 * @param {string} userId
 */
async function getTinyUserInfo(userId) {
  const query = new AV.Query('_User').select('username', 'name', 'email')
  const user = await query.get(userId, { useMasterKey: true })
  return makeTinyUserInfo(user)
}

module.exports = { encodeUserObject, makeTinyUserInfo, getTinyUserInfo, systemUser }
