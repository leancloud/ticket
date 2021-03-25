const AV = require('leanengine')
const { langs } = require('../lib/lang')

const DYNAMIC_CONTENT_NAME_REGEX = /^[a-zA-Z_]+\w+$/

async function unsetDefaultDynamicContent(name) {
  const objects = await new AV.Query('DynamicContent')
    .equalTo('name', name)
    .equalTo('isDefault', true)
    .find({ useMasterKey: true })
  objects.forEach((o) => o.unset('isDefault'))
  await AV.Object.saveAll(objects, { useMasterKey: true })
}

/**
 * @param {AV.Object} dc
 */
function validateDynamicContent(dc) {
  if (!dc.get('name')) {
    throw new AV.Cloud.Error('Dynamic content name must be provided')
  }
  if (!DYNAMIC_CONTENT_NAME_REGEX.test(dc.get('name'))) {
    throw new AV.Cloud.Error(
      'Dynamic content name can only contain letters, underscores, numbers and cannot start with a number'
    )
  }
  if (!dc.get('lang')) {
    throw new AV.Cloud.Error('Dynamic content lang must be provided')
  }
  if (!langs[dc.get('lang')]) {
    throw new AV.Cloud.Error('Unknown language: ' + dc.get('lang'))
  }
}

AV.Cloud.beforeSave('DynamicContent', async (req) => {
  const dc = req.object
  validateDynamicContent(dc)

  const ACL = new AV.ACL()
  ACL.setPublicReadAccess(true)
  ACL.setRoleReadAccess('customerService', true)
  ACL.setRoleWriteAccess('customerService', true)
  dc.setACL(ACL)

  const count = await new AV.Query('DynamicContent')
    .equalTo('name', dc.get('name'))
    .equalTo('lang', dc.get('lang'))
    .count({ useMasterKey: true })
  if (count) {
    throw new AV.Cloud.Error(`DynamicContent "${dc.get('name')}" already exists`, { code: 137 })
  }

  if (dc.get('isDefault') === true) {
    await unsetDefaultDynamicContent(dc.get('name'))
  }
})

AV.Cloud.beforeUpdate('DynamicContent', async (req) => {
  const dc = req.object
  if (dc.updatedKeys?.includes('name')) {
    throw new AV.Cloud.Error('Cannot update name of dynamic content')
  }
  if (dc.updatedKeys?.includes('lang')) {
    throw new AV.Cloud.Error('Cannot update lang of dynamic content')
  }
  if (dc.updatedKeys?.includes('isDefault') && dc.get('isDefault') === true) {
    await unsetDefaultDynamicContent(dc.get('name'))
  }
})

AV.Cloud.beforeDelete('DynamicContent', async (req) => {
  const dc = req.object
  if (dc.get('isDefault') === true) {
    const objects = await new AV.Query('DynamicContent')
      .equalTo('name', dc.get('name'))
      .notEqualTo('objectId', dc.id)
      .find({ useMasterKey: true })
    await AV.Object.destroyAll(objects, { useMasterKey: true })
  }
})
