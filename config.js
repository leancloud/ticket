const AV = require('leancloud-storage')

const { setClientGlobalVar, setClientGlobalVars } = require('./clientGlobalVar')

let host
switch (process.env.LEANCLOUD_APP_ENV) {
  case 'production':
    host = process.env.TICKET_HOST
    break
  case 'stage':
    host = process.env.TICKET_HOST_STG
    break
  case 'development':
  default:
    host = 'http://localhost:' + process.env.LEANCLOUD_APP_PORT
}

function getCORSOrigin() {
  if (!process.env.CORS_ORIGIN) {
    return false
  }
  const origins = process.env.CORS_ORIGIN.split(',').map((origin) => {
    if (/^\/.*\/$/.test(origin)) {
      return new RegExp(origin.slice(1, -1))
    } else {
      return origin
    }
  })
  return origins.length > 1 ? origins : origins[0]
}

/**
 *
 * @param {string} key
 * @returns {Promise<any | null>}
 */
async function getConfigValue(key) {
  const query = new AV.Query('Config')
  query.equalTo('key', key)
  const obj = await query.first({ useMasterKey: true })
  return obj?.get('value') ?? null
}

const allowMutateEvaluation = !!process.env.ALLOW_MUTATE_EVALUATION

module.exports = {
  host,
  oauthKey: process.env.OAUTH_KEY,
  oauthSecret: process.env.OAUTH_SECRET,
  enableLeanCloudIntegration: process.env.ENABLE_LEANCLOUD_INTEGRATION,
  leancloudAppUrl: process.env.LEANCLOUD_APP_URL,
  sentryDSN: process.env.SENTRY_API_DSN,
  sentryDSNPublic: process.env.SENTRY_WEB_DSN,
  allowMutateEvaluation,
  corsOrigin: getCORSOrigin(),
  getConfigValue,
}

const integrations = []

const zulip = require('./integrations/zulip/server')
const wechat = require('./integrations/wechat/server')

if (process.env.ZULIP_API_KEY) {
  const zulipConfig = {
    username: process.env.ZULIP_USERNAME,
    apiKey: process.env.ZULIP_API_KEY,
    realm: process.env.ZULIP_REALM,
    stream: process.env.ZULIP_STREAM,
    topic: process.env.ZULIP_TOPIC,
  }
  integrations.push(zulip(zulipConfig))
}
if (process.env.WECHAT_TOKEN) {
  const wechatConfig = {
    corpId: process.env.WECHAT_CORP_ID,
    secret: process.env.WECHAT_SECRET,
    agentId: process.env.WECHAT_AGENT_ID,
    token: process.env.WECHAT_TOKEN,
    encodingAESKey: process.env.WECHAT_ENCODING_AES_KEY,
  }
  integrations.push(wechat(wechatConfig))
}

module.exports.integrations = integrations

setClientGlobalVars({
  INTEGRATIONS: integrations.map((t) => t.name),
  ENABLE_LEANCLOUD_INTEGRATION: !!process.env.ENABLE_LEANCLOUD_INTEGRATION,
  LEANCLOUD_APP_ID: process.env.LEANCLOUD_APP_ID,
  LEANCLOUD_APP_KEY: process.env.LEANCLOUD_APP_KEY,
  LEANCLOUD_API_HOST: process.env.LEANCLOUD_API_HOST,
  LEANCLOUD_APP_ENV: process.env.LEANCLOUD_APP_ENV,
  LEANCLOUD_OAUTH_REGION: process.env.LEANCLOUD_REGION == 'US' ? 'us-w1' : 'cn-n1',
  // Use HELP_EMAIL instead of SUPPORT_EMAIL, because there is a bug in LeanEngine.
  // See #1830 of LeanEngine repo (private) for more information.
  SUPPORT_EMAIL: process.env.HELP_EMAIL,
  ALLOW_MUTATE_EVALUATION: allowMutateEvaluation,
  ENABLE_XD_OAUTH: !!process.env.ENABLE_XD_OAUTH,
})

getConfigValue('gravatar_url')
  .then((url) => url && setClientGlobalVar('GRAVATAR_URL', url))
  .catch(console.error)
