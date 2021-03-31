const AV = require('leanengine')
const { Router } = require('express')
const { check } = require('express-validator')
const { locales } = require('../lib/locale')
const { requireAuth, customerServiceOnly, catchError } = require('./middleware')

const DYNAMIC_CONTENT_NAME_REGEX = /^[a-zA-Z_]+\w*$/

async function unsetDefaultDynamicContent(name) {
  const objects = await new AV.Query('DynamicContent')
    .equalTo('name', name)
    .equalTo('default', true)
    .find({ useMasterKey: true })
  objects.forEach((o) => o.unset('default'))
  await AV.Object.saveAll(objects, { useMasterKey: true })
}

function assertLocaleIsValid(locale) {
  if (locale in locales) {
    return true
  }
  throw new Error('Invalid locale')
}

function assertNameIsValid(name) {
  if (DYNAMIC_CONTENT_NAME_REGEX.test(name)) {
    return true
  }
  throw new Error(
    'Dynamic content name can only contain letters, underscores, numbers and cannot start with a number'
  )
}

const router = Router().use(requireAuth)

router.post(
  '/',
  customerServiceOnly,
  check('name').isString().isLength({ min: 1 }).custom(assertNameIsValid),
  check('locale').isString().toLowerCase().custom(assertLocaleIsValid),
  check('content').isString().isLength({ min: 1 }),
  catchError(async (req, res) => {
    const { name, locale, content } = req.body
    let dc = await new AV.Query('DynamicContent')
      .select('objectId')
      .equalTo('name', name)
      .equalTo('default', true)
      .first({ useMasterKey: true })
    if (dc) {
      res.throw(409, 'Already exists')
    }
    dc = await new AV.Object('DynamicContent', {
      ACL: {
        '*': { read: true },
        'role:customerService': { read: true, write: true },
      },
      name,
      default: true,
      locale,
      content,
    }).save(null, { useMasterKey: true })
    res.json({ objectId: dc.id })
  })
)

router.get(
  '/',
  catchError(async (req, res) => {
    const objects = await new AV.Query('DynamicContent')
      .select('name', 'locale', 'content')
      .equalTo('default', true)
      .ascending('name')
      .find({ useMasterKey: true })
    const items = objects.map((o) => ({
      name: o.get('name'),
      variants: [
        {
          default: true,
          locale: o.get('locale'),
          content: o.get('content'),
        },
      ],
    }))
    res.json(items)
  })
)

router.param(
  'name',
  catchError((req, res, next, name) => {
    try {
      assertNameIsValid(name)
      next()
    } catch {
      res.throw(400, 'Invalid name')
    }
  })
)

router.param(
  'locale',
  catchError((req, res, next, locale) => {
    try {
      assertLocaleIsValid(locale)
      next()
    } catch {
      res.throw(400, 'Invalid locale')
    }
  })
)

router.get(
  '/:name',
  catchError(async (req, res) => {
    const { name } = req.params
    const objects = await new AV.Query('DynamicContent')
      .select('default', 'locale', 'content')
      .equalTo('name', name)
      .find({ useMasterKey: true })
    if (objects.length === 0) {
      res.throw(404, 'Not Found')
    }
    res.json({
      name,
      variants: objects.map((o) => ({
        default: !!o.get('default'),
        locale: o.get('locale'),
        content: o.get('content'),
      })),
    })
  })
)

router.delete(
  '/:name',
  customerServiceOnly,
  catchError(async (req, res) => {
    const objects = await new AV.Query('DynamicContent')
      .equalTo('name', req.params.name)
      .find({ useMasterKey: true })
    if (objects.length === 0) {
      res.throw(404, 'Not Found')
    }
    await AV.Object.destroyAll(objects, { useMasterKey: true })
    res.json({})
  })
)

router.post(
  '/:name/variants',
  customerServiceOnly,
  check('locale').isString().toLowerCase().custom(assertLocaleIsValid),
  check('default').isBoolean().optional(),
  check('content').isString().isLength({ min: 1 }),
  catchError(async (req, res) => {
    const { name } = req.params
    const { locale, default: isDefault, content } = req.body
    const defaultDCs = await new AV.Query('DynamicContent')
      .equalTo('name', name)
      .equalTo('default', true)
      .find({ useMasterKey: true })
    if (isDefault && defaultDCs.length) {
      defaultDCs.forEach((o) => o.unset('default'))
      await AV.Object.saveAll(defaultDCs, { useMasterKey: true })
    }
    const dc = await new AV.Object('DynamicContent', {
      ACL: {
        '*': { read: true },
        'role:customerService': { read: true, write: true },
      },
      name,
      locale,
      content,
      default: isDefault || defaultDCs.length === 0 || undefined,
    }).save(null, { useMasterKey: true })
    res.json({ objectId: dc.id })
  })
)

router.patch(
  '/:name/variants/:locale',
  customerServiceOnly,
  check('default').isBoolean().optional(),
  check('content').isString().isLength({ min: 1 }).optional(),
  catchError(async (req, res) => {
    const { name, locale } = req.params
    const { default: isDefault, content } = req.body
    const dc = await new AV.Query('DynamicContent')
      .equalTo('name', name)
      .equalTo('locale', locale)
      .first()
    if (!dc) {
      res.throw(404, 'Not Found')
    }

    if (isDefault === false && dc.get('default')) {
      res.throw(400, 'Cannot unset default dynamic content')
    }
    if (isDefault === true && !dc.get('default')) {
      dc.set('default', true)
      await unsetDefaultDynamicContent(dc.get('name'))
    }
    if (content) {
      dc.set('content', content)
    }
    await dc.save(null, { useMasterKey: true })
    res.json({})
  })
)

router.delete(
  '/:name/variants/:locale',
  customerServiceOnly,
  catchError(async (req, res) => {
    const { name, locale } = req.params
    const dc = await new AV.Query('DynamicContent')
      .equalTo('name', name)
      .equalTo('locale', locale)
      .first({ useMasterKey: true })
    if (!dc) {
      res.throw(404, 'Not Found')
    }
    if (dc.get('default')) {
      res.throw(409, 'Cannot delete default dynamic content')
    }
    await dc.destroy({ useMasterKey: true })
    res.json({})
  })
)

module.exports = router
