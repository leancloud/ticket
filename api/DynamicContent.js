const AV = require('leanengine')
const { Router } = require('express')
const { checkSchema } = require('express-validator')
const { langs } = require('../lib/lang')
const { requireAuth, customerServiceOnly, catchError } = require('./middleware')

const DYNAMIC_CONTENT_NAME_REGEX = /^[a-zA-Z_]+\w*$/

async function unsetDefaultDynamicContent(name) {
  const objects = await new AV.Query('DynamicContent')
    .equalTo('name', name)
    .equalTo('isDefault', true)
    .find({ useMasterKey: true })
  objects.forEach((o) => o.unset('isDefault'))
  await AV.Object.saveAll(objects, { useMasterKey: true })
}

const router = Router().use(requireAuth)

router.post(
  '/',
  customerServiceOnly,
  checkSchema({
    name: {
      isString: true,
      isLength: {
        options: { min: 1 },
      },
      custom: {
        options: (value) => {
          if (DYNAMIC_CONTENT_NAME_REGEX.test(value)) {
            return true
          }
          throw new Error(
            'Dynamic content name can only contain letters, underscores, numbers and cannot start with a number'
          )
        },
      },
    },
    lang: {
      toLowerCase: true,
      custom: {
        options: (value) => {
          if (value in langs) {
            return true
          }
          throw new Error('Unknown language')
        },
      },
    },
    content: {
      isString: true,
      isLength: {
        options: { min: 1 },
      },
    },
  }),
  catchError(async (req, res) => {
    const { name, lang, content } = req.body
    const defaultDC = await new AV.Query('DynamicContent')
      .select('objectId')
      .equalTo('name', name)
      .equalTo('isDefault', true)
      .first({ useMasterKey: true })

    if (defaultDC) {
      res.throw(409, 'Already exists')
    }

    const dc = await new AV.Object('DynamicContent', {
      ACL: {
        '*': { read: true },
        'role:customerService': { read: true, write: true },
      },
      name,
      lang,
      content,
      isDefault: true,
    }).save(null, { useMasterKey: true })
    res.json({ objectId: dc.id })
  })
)

router.get(
  '/',
  catchError(async (req, res) => {
    const objects = await new AV.Query('DynamicContent')
      .select('name', 'content', 'lang')
      .equalTo('isDefault', true)
      .ascending('name')
      .find({ useMasterKey: true })
    res.json(objects)
  })
)

router.param(
  'name',
  catchError((req, res, next, name) => {
    if (DYNAMIC_CONTENT_NAME_REGEX.test(name)) {
      next()
    } else {
      res.throw(400, 'Invalid name')
    }
  })
)

router.param(
  'lang',
  catchError((req, res, next, lang) => {
    if (lang in langs) {
      next()
    } else {
      res.throw(400, 'Unknown language')
    }
  })
)

router.get(
  '/:name',
  catchError(async (req, res) => {
    const objects = await new AV.Query('DynamicContent')
      .select('lang', 'isDefault', 'content')
      .equalTo('name', req.params.name)
      .find({ useMasterKey: true })
    if (objects.length === 0) {
      res.throw(404, 'Not Found')
    }
    res.json(objects)
  })
)

router.post(
  '/:name',
  customerServiceOnly,
  checkSchema({
    lang: {
      toLowerCase: true,
      custom: {
        options: (value) => {
          if (value in langs) {
            return true
          }
          throw new Error('Unknown language')
        },
      },
    },
    isDefault: {
      isBoolean: true,
      optional: {
        options: { nullable: true },
      },
    },
    content: {
      isString: true,
      isLength: {
        options: { min: 1 },
      },
    },
  }),
  catchError(async (req, res) => {
    const { name } = req.params
    const { lang, isDefault, content } = req.body
    const defaultDCs = await new AV.Query('DynamicContent')
      .equalTo('name', name)
      .equalTo('isDefault', true)
      .find({ useMasterKey: true })
    if (isDefault && defaultDCs.length) {
      defaultDCs.forEach((o) => o.unset('isDefault'))
      await AV.Object.saveAll(defaultDCs, { useMasterKey: true })
    }
    const dc = await new AV.Object('DynamicContent', {
      ACL: {
        '*': { read: true },
        'role:customerService': { read: true, write: true },
      },
      name,
      lang,
      content,
      isDefault: isDefault || defaultDCs.length === 0 || undefined,
    }).save(null, { useMasterKey: true })
    res.json({ objectId: dc.id })
  })
)

router.patch(
  '/:name/:lang',
  customerServiceOnly,
  catchError(async (req, res) => {
    const { name, lang } = req.params
    const { isDefault, content } = req.body
    const dc = await new AV.Query('DynamicContent')
      .equalTo('name', name)
      .equalTo('lang', lang)
      .first()
    if (!dc) {
      res.throw(404, 'Not Found')
    }

    if (isDefault === false && dc.get('isDefault')) {
      res.throw(400, 'Cannot unset isDefault of default dynamic content')
    }
    if (isDefault === true && !dc.get('isDefault')) {
      dc.set('isDefault', true)
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

router.delete(
  '/:name/:lang',
  customerServiceOnly,
  catchError(async (req, res) => {
    const { name, lang } = req.params
    const dc = await new AV.Query('DynamicContent')
      .equalTo('name', name)
      .equalTo('lang', lang)
      .first({ useMasterKey: true })
    if (!dc) {
      res.throw(404, 'Not Found')
    }
    if (dc.get('isDefault')) {
      res.throw(409, 'Cannot delete default dynamic content')
    }
    await dc.destroy({ useMasterKey: true })
    res.json({})
  })
)

module.exports = router
