const axios = require('axios').default
const FormData = require('form-data')
const crypto = require('crypto')

const { baiduTranslateAppId, baiduTranslateSecret } = require('../../config')

async function translate(text, { from = 'auto', to = 'zh' } = {}) {
  if (!baiduTranslateAppId || !baiduTranslateSecret) {
    throw new Error('Baidu translate App ID or Secret is not set')
  }

  const salt = crypto.randomBytes(16).toString('hex')
  const sign = crypto
    .createHash('md5')
    .update(baiduTranslateAppId + text + salt + baiduTranslateSecret)
    .digest('hex')

  const form = new FormData()
  form.append('q', text)
  form.append('from', from)
  form.append('to', to)
  form.append('appid', baiduTranslateAppId)
  form.append('salt', salt)
  form.append('sign', sign)

  const { data } = await axios.post('https://fanyi-api.baidu.com/api/trans/vip/translate', form, {
    headers: form.getHeaders(),
  })

  if (data.error_code && data.error_code !== '52000') {
    const error = new Error(data.error_msg)
    error.code = data.error_code
    throw error
  }

  return data.trans_result.map((result) => result.dst)
}

module.exports = { translate }
