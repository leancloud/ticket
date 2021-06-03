const { Router } = require('express')
const { check } = require('express-validator')

const { requireAuth, catchError, customerServiceOnly } = require('../middleware')
const { translate } = require('./utils')

const router = Router().use(requireAuth)

function getAcceptLanguages(acceptLanguage) {
  const languages = acceptLanguage.split(',').map((lang) => {
    const [locale, q = '1'] = lang.split(/;\s*q=/)
    return { locale: locale.trim(), q: Number(q) }
  })
  languages.sort((a, b) => b.q - a.q)
  return languages.map((lang) => lang.locale)
}

function convertLanguageCode(language) {
  const index = language.indexOf('-')
  return index === -1 ? language : language.slice(0, index)
}

router.post(
  '/',
  customerServiceOnly,
  check('text').isString().trim().isLength({ min: 1 }),
  catchError(async (req, res) => {
    const { text } = req.body
    const languages = getAcceptLanguages(req.header('Accept-Language') || 'zh')
    try {
      const result = await translate(text, {
        to: convertLanguageCode(languages[0]),
      })
      res.json({ result })
    } catch (error) {
      switch (error.code) {
        case '58001':
          res.throw(400, 'Target language is not supported')
          break
        default:
          res.throw(500, `${error.code}: ${error.message}`)
          break
      }
    }
  })
)

module.exports = router
