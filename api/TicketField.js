const AV = require('leancloud-storage')
const { Router } = require('express')
const { check } = require('express-validator')
const { requireAuth, customerServiceOnly, catchError } = require('./middleware')
const { responseAppendCount } = require('./utils')

const router = Router().use(requireAuth, customerServiceOnly)

const TYPES = ['dropdown', 'text', 'multi-line', 'multi-select', 'checkbox', 'radios']
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
const CLASS_NAME = 'TicketField'
const VARIANT_CLASS_NAME = 'TicketFieldVariant'

router.get(
  '/',
  catchError(async (req, res) => {
    const { active, search, size, skip } = req.query
    const query = new AV.Query(CLASS_NAME)
    if (size) {
      const limit = parseInt(size)
      if (!Number.isNaN(limit)) {
        query.limit(limit)
      }
    }
    if (skip) {
      const num = parseInt(skip)
      if (!Number.isNaN(num)) {
        query.skip(num)
      }
    }
    if (search) {
      query.contains('title', search)
    }
    query.equalTo('active', active !== 'false')
    // 默认按照更新排序
    query.addDescending('updatedAt')
    const [list, count] = await Promise.all([
      query.find({ useMasterKey: true }),
      query.count({
        useMasterKey: true,
      }),
    ])
    res = responseAppendCount(res, count)
    res.json(
      list.map((o) => ({
        id: o.id,
        title: o.get('title'),
        type: o.get('type'),
        default_locale: o.get('defaultLocale'),
        active: !!o.get('active'),
        required: !!o.get('required'),
      }))
    )
  })
)

router.param(
  'id',
  catchError(async (req, res, next, id) => {
    req.field = await new AV.Query(CLASS_NAME).get(id, { useMasterKey: true })
    next()
  })
)

router.get(
  '/:id',
  catchError(async (req, res) => {
    const { field } = req
    const variants = await getVariants(field.id)
    res.json({
      id: field.id,
      title: field.get('title'),
      type: field.get('type'),
      active: !!field.get('active'),
      required: !!field.get('required'),
      default_locale: field.get('defaultLocale'),
      variants: variants.map((v) => ({
        locale: v.get('locale'),
        title: v.get('title'),
        options: v.get('options'),
      })),
    })
  })
)

router.post(
  '/',
  check('title').isString().isLength({ min: 1 }),
  check('type')
    .isString()
    .custom((value) => TYPES.includes(value)),
  check('required').default(false).isBoolean(),
  check('default_locale')
    .isString()
    .custom((value) => LOCALES.includes(value)),
  check('variants').isArray().isLength({ min: 1 }),
  check('variants.*.title').isString().isLength({ min: 1 }),
  check('variants.*.locale')
    .isString()
    .custom((value) => LOCALES.includes(value)),
  check('variants.*.options').isArray().optional(),
  catchError(async (req, res) => {
    const { title, type, required, default_locale, variants } = req.body
    const variantLocales = variants.map((v) => v.locale)
    if (new Set(variantLocales).size !== variantLocales.length) {
      throw new Error('Duplicated variant locale')
    }
    if (!variantLocales.includes(default_locale)) {
      throw new Error('Variant with default locale must be provided')
    }
    if (REQUIRE_OPTIONS.includes(type)) {
      if (variants.findIndex((v) => !v.options) !== -1) {
        throw new Error('The variants.*.options is required when type is ' + type)
      }
    }
    const field = new AV.Object(CLASS_NAME)
    // TODO
    await field.save(
      {
        ACL: {},
        title,
        type,
        required,
        active: true,
        defaultLocale: default_locale,
      },
      {
        useMasterKey: true,
      }
    )
    await addVariants(variants, field)
    res.json({ id: field.id })
  })
)

router.patch(
  '/:id',
  check('title').isString().isLength({ min: 1 }).optional(),
  check('active').isBoolean().optional(),
  check('required').isBoolean().optional(),
  check('default_locale')
    .isString()
    .custom((value) => LOCALES.includes(value))
    .optional(),
  catchError(async (req, res) => {
    const { field } = req
    const { title, active, required, default_locale, variants } = req.body
    if (title !== undefined) {
      field.set('title', title)
    }
    if (active !== undefined) {
      field.set('active', active)
    }
    if (required !== undefined) {
      field.set('required', required)
    }
    if (default_locale !== undefined) {
      field.set('defaultLocale', default_locale)
    }
    if (variants !== undefined) {
      await updateVariants(variants, field)
    }
    await field.save(null, { useMasterKey: true })
    res.json({})
  })
)

function addVariants(variants, field) {
  if (!Array.isArray(variants)) {
    throw new Error('Variant must be array')
  }
  const objects = variants.map(
    (v) =>
      new AV.Object(VARIANT_CLASS_NAME, {
        ACL: {},
        locale: v.locale,
        title: v.title,
        options: v.options,
        field,
      })
  )
  return AV.Object.saveAll(objects, { useMasterKey: true })
}

function getVariants(id) {
  return new AV.Query(VARIANT_CLASS_NAME)
    .equalTo('field', AV.Object.createWithoutData(CLASS_NAME, id))
    .addAscending('locale')
    .find({ useMasterKey: true })
}

async function updateVariants(newVariants, field) {
  const variants = await getVariants(field.id)
  await AV.Object.destroyAll(variants, { useMasterKey: true })
  return addVariants(newVariants, field)
}
/**
 * fieldIds 获取字段详情
 * @param {*} fieldIds
 */
async function getFieldsDetail(fieldIds) {
  const fieldQuery = new AV.Query(CLASS_NAME)
  fieldQuery.containedIn('objectId', fieldIds)

  const variantQuery = new AV.Query(VARIANT_CLASS_NAME)
  variantQuery.containedIn(
    'field',
    fieldIds.map((fieldId) => AV.Object.createWithoutData(CLASS_NAME, fieldId))
  )

  const [fields, variants] = await Promise.all([
    fieldQuery.find({ useMasterKey: true }).then((fields) => fields.map((field) => field.toJSON())),
    variantQuery
      .find({ useMasterKey: true })
      .then((variants) => variants.map((variant) => variant.toJSON())),
  ])

  const variantsMap = variants.reduce((pre, current) => {
    const data = {
      locale: current.locale,
      title: current.title,
      options: current.options,
    }
    pre[current.field.objectId] = pre[current.field.objectId]
      ? [...pre[current.field.objectId], data]
      : [data]
    return pre
  }, {})

  return fields.map((field) => ({
    id: field.objectId,
    title: field.title,
    type: field.type,
    active: !!field.active,
    required: !!field.required,
    defaultLocale: field.defaultLocale,
    variants: variantsMap[field.objectId],
  }))
}

module.exports = { router, LOCALES, getFieldsDetail }
