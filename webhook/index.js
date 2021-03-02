const crypto = require('crypto')
const request = require('request-promise')
const AV = require('leanengine')
const { isCustomerService } = require('../api/common')

let webhooks = []

async function refreshWebhooks() {
  const query = new AV.Query('Webhook')
  const objects = await query.find({ useMasterKey: true })
  webhooks = objects.map(o => ({
    objectId: o.id,
    url: o.get('url'),
    secret: o.get('secret'),
  }))
}

function invokeWebhooks(data) {
  webhooks.forEach(hook => {
    const body = JSON.stringify(data)
    const hash = crypto
      .createHmac('sha256', hook.secret)
      .update(body)
      .digest('base64')
    request({
      body,
      method: 'POST',
      url: hook.url,
      headers: {
        'content-type': 'application/json',
        'x-leanticket-hmac-sha256': hash
      },
    })
  })
}

AV.Cloud.define('addWebhook', async (req) => {
  if (!await isCustomerService(req.currentUser)) {
    throw new AV.Cloud.Error('Forbidden', { status: 403 })
  }

  const { url, secret } = req.params
  if (typeof url !== 'string' || typeof secret !== 'string') {
    throw new AV.Cloud.Error('The url and secret must be a string', { status: 400 })
  }

  try {
    await new AV.Object('Webhook', { url, secret }).save(null, { useMasterKey: true })
    await refreshWebhooks()
  } catch (error) {
    throw new AV.Cloud.Error('Internal Error', { status: 500 })
  }
})

AV.Cloud.define('removeWebhook', async (req) => {
  if (!await isCustomerService(req.currentUser)) {
    throw new AV.Cloud.Error('Forbidden', { status: 403 })
  }

  const { id } = req.params
  if (typeof id !== 'string') {
    throw new AV.Cloud.Error('The id must be a string', { status: 400 })
  }

  try {
    await AV.Object.createWithoutData('Webhook', id).destroy({ useMasterKey: true })
    await refreshWebhooks()
  } catch (error) {
    throw new AV.Cloud.Error('Internal Error', { status: 500 })
  }
})

AV.Cloud.define('refreshWebhooks', async (req) => {
  if (!await isCustomerService(req.currentUser)) {
    throw new AV.Cloud.Error('Forbidden', { status: 403 })
  }

  try {
    await refreshWebhooks()
  } catch (error) {
    throw new AV.Cloud.Error('Internal Error', { status: 500 })
  }
})

module.exports = {
  webhooks,
  refreshWebhooks,
  invokeWebhooks,
}
