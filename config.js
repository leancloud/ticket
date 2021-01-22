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
  enableLeanCloudIntergration: process.env.ENABLE_LEANCLOUD_INTERGRATION,
  leancloudAppUrl: process.env.LEANCLOUD_APP_URL_V2,
  mailgunKey: process.env.MAILGUN_KEY,
  mailgunDomain: process.env.MAILGUN_DOMAIN,
  wechatCorpID: process.env.WECHAT_CORP_ID,
  wechatSecret: process.env.WECHAT_SECRET,
  wechatAgentId: process.env.WECHAT_AGENT_ID,
  wechatToken: process.env.WECHAT_TOKEN,
  wechatEncodingAESKey: process.env.WECHAT_ENCODING_AES_KEY,
  bearychatGlobalHookUrl: process.env.BEARYCHAT_GLOBAL_HOOK_URL,
  zulip: {
    username: process.env.ZULIP_USERNAME,
    apiKey: process.env.ZULIP_API_KEY,
    realm: process.env.ZULIP_REALM,
    stream: process.env.ZULIP_STREAM,
    topic: process.env.ZULIP_TOPIC,
  },
  sentryDSN: process.env.SENTRY_DSN,
  sentryDSNPublic: process.env.SENTRY_DSN_PUBLIC,
  supportEmail: 'ask@leancloud.rocks',
  // Used in CustomerServiceStats.
  // 0/-1/-2/...: a week ends at 23:59:59 Sunday/Saturday/Friday/...
  offsetDays: Number(process.env.OFFSET_DAYS || '0')
}
