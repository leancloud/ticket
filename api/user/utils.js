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
  }
}

module.exports = { encodeUserObject }
