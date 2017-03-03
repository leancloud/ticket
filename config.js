module.exports = {
  host: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.TICKET_HOST,
  leancloudOauthKey: process.env.LEANCLOUD_OAUTH_KEY,
  leancloudOauthSecret: process.env.LEANCLOUD_OAUTH_SECRET,
  mailgunKey: process.env.MAILGUN_KEY,
  mailgunDomain: process.env.MAILGUN_DOMAIN,
}
