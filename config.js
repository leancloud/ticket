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

module.exports = {
  host,
  oauthKey: process.env.OAUTH_KEY,
  oauthSecret: process.env.OAUTH_SECRET,
  enableLeanCloudIntegration: process.env.ENABLE_LEANCLOUD_INTEGRATION,
  leancloudAppUrl: process.env.LEANCLOUD_APP_URL_V2,
  sentryDSN: process.env.SENTRY_DSN,
  sentryDSNPublic: process.env.SENTRY_DSN_PUBLIC,
  // Use HELP_EMAIL instead of SUPPORT_EMAIL, because there is a bug in LeanEngine.
  // See #1830 of LeanEngine repo (private) for more information.
  supportEmail: process.env.HELP_EMAIL
}

const integrations = []

const mailgun = require('./integrations/mailgun/server')
const zulip = require('./integrations/zulip/server')
const wechat = require('./integrations/wechat/server')

if (process.env.MAILGUN_KEY && process.env.MAILGUN_DOMAIN) {
  integrations.push(
    mailgun(process.env.MAILGUN_KEY, process.env.MAILGUN_DOMAIN)
  )
}
if (process.env.ZULIP_API_KEY) {
  const zulipConfig = {
    username: process.env.ZULIP_USERNAME,
    apiKey: process.env.ZULIP_API_KEY,
    realm: process.env.ZULIP_REALM,
    stream: process.env.ZULIP_STREAM,
    topic: process.env.ZULIP_TOPIC
  }
  integrations.push(zulip(zulipConfig))
}
if (process.env.WECHAT_TOKEN) {
  const wechatConfig = {
    corpId: process.env.WECHAT_CORP_ID,
    secret: process.env.WECHAT_SECRET,
    agentId: process.env.WECHAT_AGENT_ID,
    token: process.env.WECHAT_TOKEN,
    encodingAESKey: process.env.WECHAT_ENCODING_AES_KEY
  }
  integrations.push(wechat(wechatConfig))
}

module.exports.integrations = integrations