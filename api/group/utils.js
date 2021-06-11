const AV = require('leancloud-storage')

function encodeGroupObject(group) {
  if (!group) {
    return null
  }
  return {
    id: group.id,
    name: group.get('name'),
  }
}

async function getTinyGroupInfo(groupId) {
  if (groupId === '') {
    return null
  }
  const group = await new AV.Query('Group').get(groupId, { useMasterKey: true })
  return {
    objectId: group.id,
    name: group.get('name'),
  }
}

module.exports = { encodeGroupObject, getTinyGroupInfo }
