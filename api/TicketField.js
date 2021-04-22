const AV = require('leancloud-storage')
const { Router } = require('express')
const { check } = require('express-validator')

const { requireAuth, customerServiceOnly, catchError } = require('./middleware')

const router = Router().use(requireAuth, customerServiceOnly)

const TYPES = ['dropdown', 'text', 'multi-line', 'select', 'multi-select', 'checkbox', 'numeric']
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
  check('required').isBoolean().optional().default(false),
  check('defaultLocale')
    .isString()
    .custom((value) => LOCALES.includes(value)),
  check('variants').isArray().isLength({ min: 1 }),
  check('variants.*.title').isString().isLength({ min: 1 }),
  check('variants.*.locale')
    .isString()
    .custom((value) => LOCALES.includes(value)),
  check('variants.*.options').isArray().optional(),
  check('variants.*.options.*').isString(),
  catchError(async (req, res) => {
    const { name, type, required, defaultLocale, variants } = req.body
    const variantLocales = variants.map((v) => v.locale)
    if (new Set(variantLocales).size !== variantLocales.length) {
      throw new Error('Duplicated variant locale')
    }
    if (!variantLocales.includes(defaultLocale)) {
      throw new Error('Variant with default locale must be provided')
    }
    if (type === 'select' || type === 'multi-select') {
      if (variants.findIndex((v) => !v.options) !== -1) {
        throw new Error('The variants.*.options is required when type is ' + req.body.type)
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
    const { page } = req.query
    const query = new AV.Query('TicketField')
    if (page?.size) {
      const limit = parseInt(page.size)
      if (!Number.isNaN(limit)) {
        query.limit(limit)
      }
    }
    if (page?.after) {
      query.greaterThan('objectId', page.after)
    }

    const objects = await query.find({ useMasterKey: true })
    res.json(
      objects.map((o) => ({
        id: o.id,
        name: o.get('name'),
        type: o.get('type'),
        defaultLocale: o.get('defaultLocale'),
        active: !!o.get('active'),
        required: !!o.get('required'),
      }))
    )
  })
)

router.param(
  'id',
  catchError(async (req, res, next, id) => {
    req.object = await new AV.Query('TicketField').get(id, { useMasterKey: true })
    next()
  })
)

router.get(
  '/:id',
  catchError(async (req, res) => {
    const { object } = req
    const variants = await getVariants(object.id)
    res.json({
      name: object.get('name'),
      type: object.get('type'),
      active: !!object.get('active'),
      required: !!object.get('required'),
      defaultLocale: object.get('defaultLocale'),
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
    const { object } = req
    if (name) {
      object.set('name', name)
    }
    if (active !== undefined) {
      object.set('active', active)
    }
    if (required !== undefined) {
      object.set('required', required)
    }
    if (defaultLocale) {
      const varaiants = await getVariants(object.id)
      if (varaiants.findIndex((v) => v.locale === defaultLocale) === -1) {
        throw new Error('Variant with default locale must be provided')
      }
      object.set('defaultLocale', defaultLocale)
    }
    await object.save(null, { useMasterKey: true })
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
  check('options.*').isString(),
  catchError(async (req, res) => {
    const { object } = req
    const type = object.get('type')
    const { title, locale, options } = req.body
    if (type === 'select' || type === 'multi-select') {
      if (!options) {
        throw new Error('The options is required when type is ' + type)
      }
    }
    await new AV.Object('TicketFieldVariant', {
      ACL: {},
      field: object,
      title,
      locale,
      options,
    }).save(null, { useMasterKey: true })
    res.json({})
  })
)

module.exports = router
