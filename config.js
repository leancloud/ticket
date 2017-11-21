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
  leancloudAppUrl: process.env.LEANCLOUD_APP_URL,
  mailgunKey: process.env.MAILGUN_KEY,
  mailgunDomain: process.env.MAILGUN_DOMAIN,
  wechatCorpID: process.env.WECHAT_CORP_ID,
  wechatSecret: process.env.WECHAT_SECRET,
  wechatAgentId: process.env.WECHAT_AGENT_ID,
  wechatToken: process.env.WECHAT_TOKEN,
  wechatEncodingAESKey: process.env.WECHAT_ENCODING_AES_KEY,
  bearychatGlobalHookUrl: process.env.BEARYCHAT_GLOBAL_HOOK_URL,
  sentryDSN: process.env.SENTRY_DSN,
  sentryDSNPublic: process.env.SENTRY_DSN_PUBLIC
}
