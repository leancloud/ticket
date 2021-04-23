const AV = require('leancloud-storage')
const { Router } = require('express')
const { check } = require('express-validator')

const { requireAuth, customerServiceOnly, catchError } = require('./middleware')

const router = Router().use(requireAuth, customerServiceOnly)

const TYPES = ['dropdown', 'text', 'multi-line', 'multi-select', 'checkbox', 'numeric']
const LOCALES = [
  'zh-cn',
  'zh-tw',
  'zh-hk',
  'en',
  'ja',
  'ko',
  'id',
  'th',
  'de',
  'fr',
  'ru',
  'es',
  'pt',
  'tr',
]
const REQUIRE_OPTIONS = ['dropdown', 'multi-select']

function getVariants(id) {
  return new AV.Query('TicketFieldVariant')
    .equalTo('field', AV.Object.createWithoutData('TicketField', id))
    .addAscending('locale')
    .find({ useMasterKey: true })
}

router.post(
  '/',
  check('name').isString().isLength({ min: 1 }),
  check('type')
    .isString()
    .custom((value) => TYPES.includes(value)),
  check('required').default(false).isBoolean(),
  check('defaultLocale')
    .isString()
    .custom((value) => LOCALES.includes(value)),
  check('variants').isArray().isLength({ min: 1 }),
  check('variants.*.title').isString().isLength({ min: 1 }),
  check('variants.*.locale')
    .isString()
    .custom((value) => LOCALES.includes(value)),
  check('variants.*.options').isArray().optional(),
  check('variants.*.options.*.title').isString(),
  check('variants.*.options.*.value').isString(),
  catchError(async (req, res) => {
    const { name, type, required, defaultLocale, variants } = req.body
    const variantLocales = variants.map((v) => v.locale)
    if (new Set(variantLocales).size !== variantLocales.length) {
      throw new Error('Duplicated variant locale')
    }
    if (!variantLocales.includes(defaultLocale)) {
      throw new Error('Variant with default locale must be provided')
    }
    if (REQUIRE_OPTIONS.includes(type)) {
      if (variants.findIndex((v) => !v.options) !== -1) {
        throw new Error('The variants.*.options is required when type is ' + type)
      }
    }

    const field = new AV.Object('TicketField')
    await field.save(
      {
        ACL: {},
        name,
        type,
        required,
        active: true,
        defaultLocale,
      },
      {
        useMasterKey: true,
      }
    )
    const fieldVariants = variants.map(
      (v) =>
        new AV.Object('TicketFieldVariant', {
          ACL: {},
          field,
          locale: v.locale,
          title: v.title,
          options: v.options,
        })
    )
    await AV.Object.saveAll(fieldVariants, { useMasterKey: true })
    res.json({ id: field.id })
  })
)

router.get(
  '/',
  catchError(async (req, res) => {
    const { page, active } = req.query
    const query = new AV.Query('TicketField')
    if (page?.size) {
      const limit = parseInt(page.size)
      if (!Number.isNaN(limit)) {
        query.limit(limit)
      }
    }
    if (page?.skip) {
      const skip = parseInt(page.skip)
      if (!Number.isNaN(skip)) {
        query.skip(skip)
      }
    }
    if (active === 'true') {
      query.equalTo('active', true)
    }
    if (active === 'false') {
      query.equalTo('active', false)
    }

    const fields = await query.find({ useMasterKey: true })
    res.json({
      fields: fields.map((o) => ({
        id: o.id,
        name: o.get('name'),
        type: o.get('type'),
        defaultLocale: o.get('defaultLocale'),
        active: !!o.get('active'),
        required: !!o.get('required'),
      })),
    })
  })
)

router.param(
  'id',
  catchError(async (req, res, next, id) => {
    req.field = await new AV.Query('TicketField').get(id, { useMasterKey: true })
    next()
  })
)

router.get(
  '/:id',
  catchError(async (req, res) => {
    const { field } = req
    const variants = await getVariants(field.id)
    res.json({
      name: field.get('name'),
      type: field.get('type'),
      active: !!field.get('active'),
      required: !!field.get('required'),
      defaultLocale: field.get('defaultLocale'),
      variants: variants.map((v) => ({
        locale: v.get('locale'),
        title: v.get('title'),
        options: v.get('options'),
      })),
    })
  })
)

router.patch(
  '/:id',
  check('name').isString().isLength({ min: 1 }).optional(),
  check('active').isBoolean().optional(),
  check('required').isBoolean().optional(),
  check('defaultLocale')
    .isString()
    .custom((value) => LOCALES.includes(value))
    .optional(),
  catchError(async (req, res) => {
    const { name, active, required, defaultLocale } = req.body
    const { field } = req
    if (name) {
      field.set('name', name)
    }
    if (active !== undefined) {
      field.set('active', active)
    }
    if (required !== undefined) {
      field.set('required', required)
    }
    if (defaultLocale) {
      const varaiants = await getVariants(field.id)
      if (varaiants.findIndex((v) => v.locale === defaultLocale) === -1) {
        throw new Error(`No such variant with locale "${defaultLocale}"`)
      }
      field.set('defaultLocale', defaultLocale)
    }
    await field.save(null, { useMasterKey: true })
    res.json({})
  })
)

router.post(
  '/:id/variants',
  check('title').isString().isLength({ min: 1 }),
  check('locale')
    .isString()
    .custom((value) => LOCALES.includes(value)),
  check('options').isArray().optional(),
  check('options.*.title').isString(),
  check('options.*.value').isString(),
  catchError(async (req, res) => {
    const { field } = req
    const type = field.get('type')
    const { title, locale, options } = req.body
    if (REQUIRE_OPTIONS.includes(type)) {
      if (!options) {
        throw new Error('The options is required when type is ' + type)
      }
    }
    await new AV.Object('TicketFieldVariant', {
      ACL: {},
      field,
      title,
      locale,
      options,
    }).save(null, { useMasterKey: true })
    res.json({})
  })
)

router.param(
  'locale',
  catchError(async (req, res, next, locale) => {
    if (!LOCALES.includes(locale)) {
      throw new Error('Unsupported locale')
    }
    const variant = await new AV.Query('TicketFieldVariant')
      .equalTo('field', req.field)
      .equalTo('locale', locale)
      .first({ useMasterKey: true })
    if (!variant) {
      res.throw(404, 'Field variant not found')
    }
    req.variant = variant
    next()
  })
)

router.patch(
  '/:id/variants/:locale',
  check('title').isString().isLength({ min: 1 }).optional(),
  check('options').isArray().optional(),
  check('options.*.title').isString(),
  check('options.*.value').isString(),
  catchError(async (req, res) => {
    const { title, options } = req.body
    const { field, variant } = req
    if (title) {
      variant.set('title', title)
    }
    if (REQUIRE_OPTIONS.includes(field.get('type')) && options) {
      variant.set('options', options)
    }
    await variant.save(null, { useMasterKey: true })
    res.json({})
  })
)

router.delete(
  '/:id/variants/:locale',
  catchError(async (req, res) => {
    const { field, variant } = req
    if (variant.get('locale') === field.get('defaultLocale')) {
      throw new Error('Cannot delete variant of default locale')
    }
    await variant.destroy({ useMasterKey: true })
    res.json({})
  })
)

module.exports = router
