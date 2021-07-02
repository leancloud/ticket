const axios = require('axios').default
const FormData = require('form-data')
const crypto = require('crypto')
const AV = require('leancloud-storage')

const config = { appId: '', secret: '' }

async function loadConfig() {
  const query = new AV.Query('Config').equalTo('key', 'translate.baidu')
  const remoteConfig = (await query.first({ useMasterKey: true }))?.get('value')
  if (remoteConfig) {
    ;['appId', 'secret'].forEach((key) => {
      if (!remoteConfig[key]) {
        throw new Error(`[Baidu Translate]: ${key} is missing`)
      }
    })
    Object.assign(config, remoteConfig)
    console.log(`[Baidu Translate]: enabled (appId=${config.appId})`)
  }
}

async function translate(text, { from = 'auto', to = 'zh' } = {}) {
  if (!config.appId || !config.secret) {
    throw new Error('Baidu translate App ID or Secret is not set')
  }

  const salt = crypto.randomBytes(16).toString('hex')
  const sign = crypto
    .createHash('md5')
    .update(config.appId + text + salt + config.secret)
    .digest('hex')

  const form = new FormData()
  form.append('q', text)
  form.append('from', from)
  form.append('to', to)
  form.append('appid', config.appId)
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

loadConfig().catch(console.warn)

module.exports = { translate }
