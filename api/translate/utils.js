const axios = require('axios').default
const FormData = require('form-data')
const crypto = require('crypto')
const AV = require('leancloud-storage')

const config = { appId: '', secret: '' }

async function loadConfig() {
  const query = new AV.Query('Config').startsWith('key', 'translate.baidu')
  const items = await query.find({ useMasterKey: true })
  if (items.length) {
    const newConfig = {}
    items.forEach((item) => {
      switch (item.get('key')) {
        case 'translate.baidu.appId':
          newConfig.appId = item.get('value')
          break
        case 'translate.baidu.secret':
          newConfig.secret = item.get('value')
          break
      }
    })
    ;['appId', 'secret'].forEach((key) => {
      if (!newConfig[key]) {
        throw new Error(`[Baidu Translate]: ${key} is missing`)
      }
    })
    Object.assign(config, newConfig)
    console.log('[Baidu Translate]: enabled')
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

loadConfig()

module.exports = { translate }
