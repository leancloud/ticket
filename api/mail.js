const config = require('../config')
const AV = require('leanengine')
const mailgun = require('mailgun-js')({apiKey: config.mailgunKey, domain: config.mailgunDomain})

exports.mailgun = mailgun

exports.send = (data) => {
  return new Promise((resolve, reject) => {
    mailgun.messages().send({
      from: data.from,
      to: data.to,
      subject: data.subject,
      text: `${data.text}
--
您能收到邮件是因为该工单与您相关。
可以直接回复邮件，或者点击 ${data.url} 查看。`,
    }, function (err, body) {
      new AV.Object('MailLog').save({
        data,
        result: body,
        err,
      })
      if (err) {
        return reject(err)
      }
      resolve(body)
    })
  })
}
