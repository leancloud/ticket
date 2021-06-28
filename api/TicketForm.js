const AV = require('leancloud-storage')
const { Router } = require('express')
const { check } = require('express-validator')
const { requireAuth, customerServiceOnly, catchError } = require('./middleware')
const { getPaginationList } = require('./utils')
const router = Router().use(requireAuth, customerServiceOnly)
const CLASS_NAME = 'TicketForm'

router.get(
  '/',
  catchError(async (req, res) => {
    const query = new AV.Query(CLASS_NAME)
    // 默认按照更新排序
    query.addDescending('updatedAt')
    const list = await getPaginationList(req, res, query)
    res.json(
      list.map((o) => ({
        id: o.id,
        title: o.get('title'),
        updatedAt: o.get('updatedAt'),
      }))
    )
  })
)

router.param(
  'id',
  catchError(async (req, res, next, id) => {
    req.form = await new AV.Query(CLASS_NAME).get(id, { useMasterKey: true })
    next()
  })
)

router.get(
  '/:id',
  catchError(async (req, res) => {
    const { form } = req
    res.json({
      id: form.id,
      title: form.get('title'),
      updatedAt: form.get('updatedAt'),
      fieldIds: form.get('fieldIds'),
    })
  })
)

router.get(
  '/:id/details',
  catchError(async (req, res) => {
    const { form } = req
    const fieldIds = form.get('fieldIds')
    const fieldQuery = new AV.Query('TicketField')
    fieldQuery.containedIn('objectId', fieldIds)
    const variantQuery = new AV.Query('TicketFieldVariant')
    variantQuery.containedIn(
      'field',
      fieldIds.map((fieldId) => AV.Object.createWithoutData('TicketField', fieldId))
    )
    const [fields, variants] = await Promise.all([
      fieldQuery
        .find({ useMasterKey: true })
        .then((fields) => fields.map((field) => field.toJSON())),
      variantQuery
        .find({ useMasterKey: true })
        .then((variants) => variants.map((variant) => variant.toJSON())),
    ])
    const variantMap = variants.reduce((pre, current) => {
      pre[current.field.objectId] = {
        locale: current.locale,
        title: current.title,
        options: current.options,
      }
      return pre
    }, {})
    res.json({
      id: form.id,
      title: form.get('title'),
      updatedAt: form.get('updatedAt'),
      fields: fields.map((field) => ({
        id: field.objectId,
        title: field.title,
        type: field.type,
        active: !!field.active,
        required: !!field.required,
        defaultLocale: field.defaultLocale,
        variants: variantMap[field.objectId],
      })),
    })
  })
)

router.post(
  '/',
  check('title').isString().isLength({ min: 1 }),
  check('fieldIds').isArray().isLength({ min: 1 }),
  catchError(async (req, res) => {
    const { title, fieldIds } = req.body
    const form = new AV.Object(CLASS_NAME)
    await form.save(
      {
        ACL: {},
        fieldIds,
        title,
      },
      {
        useMasterKey: true,
      }
    )
    res.json({ id: form.id })
  })
)

router.patch(
  '/:id',
  check('title').isString().isLength({ min: 1 }),
  check('fieldIds').isArray().isLength({ min: 1 }),
  catchError(async (req, res) => {
    const { form } = req
    const { title, fieldIds } = req.body
    if (title !== undefined) {
      form.set('title', title)
    }
    if (fieldIds !== undefined) {
      form.set('fieldIds', fieldIds)
    }
    await form.save(null, { useMasterKey: true })
    res.json({})
  })
)

router.delete(
  '/:id',
  customerServiceOnly,
  catchError(async (req, res) => {
    const { form } = req
    await form.destroy({ useMasterKey: true })
    res.json({})
  })
)

module.exports = router
