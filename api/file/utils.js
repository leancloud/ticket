const crypto = require('crypto')

const { EXTERNAL_QINIU_AK, EXTERNAL_QINIU_SK, EXTERNAL_FILE_SIGN_ENABLED } = process.env
const externalFileSignEnabled =
  !!EXTERNAL_QINIU_AK && !!EXTERNAL_QINIU_SK && !!EXTERNAL_FILE_SIGN_ENABLED
const SIGNATURE_TTL = 3600

const hmacSha1 = (source) =>
  crypto.createHmac('sha1', EXTERNAL_QINIU_SK).update(source).digest('base64')
/**
 * @param {AV.File} file
 */
const getSignedURL = (file) => {
  const url = new URL(file.get('url'))

  url.searchParams.set('e', (Math.floor(Date.now() / 1000) + SIGNATURE_TTL).toString())
  const urlWithTS = url.toString()
  const signature = hmacSha1(urlWithTS)
  const urlSafeSign = signature.replace(/\//g, '_').replace(/\+/g, '-')
  var token = `${EXTERNAL_QINIU_AK}:${urlSafeSign}`
  return `${urlWithTS}&token=${token}`
}

/**
 * @param {AV.Object} file
 */
function encodeFileObject(file) {
  return {
    id: file.id,
    name: file.get('name'),
    mime: file.get('mime_type'),
    url:
      externalFileSignEnabled && file.get('metaData')?.external
        ? getSignedURL(file)
        : file.get('url'),
  }
}

module.exports = { encodeFileObject }
