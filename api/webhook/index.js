const crypto = require('crypto')
const request = require('request-promise')
const AV = require('leanengine')
const { isCustomerService } = require('../common')

let webhooks = []

async function refreshWebhooks() {
  const objects = await new AV.Query('Webhook').find({ useMasterKey: true })
  webhooks = objects.map((o) => ({
    objectId: o.id,
    url: o.get('url'),
    secret: o.get('secret'),
  }))
  console.log('[Webhook] load webhooks:', webhooks)
}

function generateHash(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64')
}

function invokeWebhooks(action, payload) {
  webhooks.forEach(({ url, secret }) => {
    const body = JSON.stringify({
      action,
      payload,
      ts: new Date().toISOString(),
    })
    request({
      url,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-leanticket-hmac-sha256': generateHash(secret, body),
      },
      body,
    })
  })
}

AV.Cloud.define('addWebhook', async (req) => {
  if (!(await isCustomerService(req.currentUser))) {
    throw new AV.Cloud.Error('Forbidden', { status: 403 })
  }

  const { url, secret } = req.params
  if (typeof url !== 'string' || typeof secret !== 'string') {
    throw new AV.Cloud.Error('The url and secret must be a string', { status: 400 })
  }

  try {
    const hookData = { url, secret, ACL: {} }
    await new AV.Object('Webhook', hookData).save(null, { useMasterKey: true })
    await refreshWebhooks()
  } catch (error) {
    throw new AV.Cloud.Error('Internal Error', { status: 500 })
  }
})

AV.Cloud.define('removeWebhook', async (req) => {
  if (!(await isCustomerService(req.currentUser))) {
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

module.exports = {
  webhooks,
  refreshWebhooks,
  invokeWebhooks,
}
