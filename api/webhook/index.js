const crypto = require('crypto')
const request = require('request-promise')
const AV = require('leanengine')

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

module.exports = {
  webhooks,
  refreshWebhooks,
  invokeWebhooks,
}
