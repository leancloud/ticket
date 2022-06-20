const { Router } = require('express')
const { check, query } = require('express-validator')
const { requireAuth, catchError, customerServiceOnly } = require('../middleware')
const { responseAppendCount } = require('../utils')
const { isStaff } = require('../common')
const { LOCALES, TYPES, REQUIRE_OPTIONS } = require('./constant')
const fieldService = require('./fieldService').service
const variantService = require('./variantService').service
const router = Router().use(requireAuth)

const merge = (field, variants, locale) => {
  if (!locale) {
    return {
      ...field,
      variants,
    }
  }
  locale = locale === 'default' ? field.default_locale : locale
  const filterVariants = variants.filter((variant) => variant.locale === locale)
  if (filterVariants.length > 0) {
    return {
      ...field,
      variants: filterVariants,
    }
  }
  return {
    ...field,
    variants: variants.filter((variant) => variant.locale === field.default_locale),
  }
}

router.get(
  '/',
  query('size')
    .isInt()
    .toInt()
    .custom((size) => size > 0)
    .optional(),
  query('skip')
    .isInt()
    .toInt()
    .custom((skip) => skip >= 0)
    .optional(),
  query('search').isString().optional(),
  query('ids')
    .isString()
    .customSanitizer((ids) => {
      return ids.split(',').filter((v) => v)
    })
    .optional(),
  query('includeVariant').isBoolean().toBoolean().optional(),
  query('locale')
    .isString()
    .customSanitizer((locale) => {
      locale = locale.toLowerCase()
      return locale === 'zh' ? 'zh-cn' : locale
    })
    .optional(),
  catchError(async (req, res) => {
    let { size, skip, search, ids, includeVariant, locale } = req.query
    const queryOptions = {
      limit: size,
      skip,
      search,
      ids,
    }
    const asStaff = await isStaff(req.user)
    const list = await fieldService.list(queryOptions, asStaff)
    if (size !== undefined || skip !== undefined) {
      const count = await fieldService.count(queryOptions)
      res = responseAppendCount(res, count)
    }
    if (includeVariant) {
      const variants = await variantService.list(
        list.map((field) => field.id),
        asStaff
      )
      const variantMap = variants.reduce((pre, curr) => {
        const key = curr.field_id
        pre[key] = pre[key] ? pre[key].concat([curr]) : [curr]
        return pre
      }, {})
      res.json(list.map((field) => merge(field, variantMap[field.id] || [], locale)))
    } else {
      res.json(list)
    }
  })
)

router.post(
  '/',
  customerServiceOnly,
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
    const field = await fieldService.add({
      title,
      type,
      required,
      default_locale,
      variants,
      active: true,
    })
    const variantList = await variantService.add(field.id, variants)
    res.json({
      ...field,
      variants: variantList,
    })
  })
)

router.get(
  '/:id',
  query('locale')
    .isString()
    .customSanitizer((locale) => {
      locale = locale.toLowerCase()
      return locale === 'zh' ? 'zh-cn' : locale
    })
    .custom((value) => value === 'default' || LOCALES.includes(value))
    .optional(),
  catchError(async (req, res) => {
    const { id } = req.params
    const locale = req.query.locale
    const field = await fieldService.get(id)
    const variants = await variantService.list([id], await isStaff(req.user))
    res.json(merge(field, variants, locale))
  })
)

router.patch(
  '/:id',
  customerServiceOnly,
  check('title').isString().isLength({ min: 1 }).optional(),
  check('active').isBoolean().optional(),
  check('required').isBoolean().optional(),
  check('default_locale')
    .isString()
    .custom((value) => LOCALES.includes(value))
    .optional(),
  check('variants').isArray().isLength({ min: 1 }).optional(),
  catchError(async (req, res) => {
    const { id } = req.params
    const { variants, ...rest } = req.body
    const result = await fieldService.update(id, rest)
    if (variants) {
      await variantService.update(id, variants)
    }
    res.json({
      ...result,
      variants,
    })
  })
)

module.exports = router
