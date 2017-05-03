module.exports = {
  host: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.TICKET_HOST,
  leancloudOauthKey: process.env.LEANCLOUD_OAUTH_KEY,
  leancloudOauthSecret: process.env.LEANCLOUD_OAUTH_SECRET,
  mailgunKey: process.env.MAILGUN_KEY,
  mailgunDomain: process.env.MAILGUN_DOMAIN,
  wechatCorpID: process.env.WECHAT_CORP_ID,
  wechatSecret: process.env.WECHAT_SECRET,
  wechatAgentId: process.env.WECHAT_AGENT_ID,
  wechatToken: process.env.WECHAT_TOKEN,
  wechatEncodingAESKey: process.env.WECHAT_ENCODING_AES_KEY,
}
