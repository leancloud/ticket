const AV = require('leancloud-storage')
const { Router } = require('express')
const { check } = require('express-validator')
const { requireAuth, customerServiceOnly, catchError } = require('./middleware')
const { responseAppendCount } = require('./utils')
const { LOCALES, getFieldsDetail } = require('./TicketField')
const router = Router().use(requireAuth, customerServiceOnly)
const CLASS_NAME = 'TicketForm'

router.get(
  '/',
  catchError(async (req, res) => {
    const { size, skip } = req.query
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
  check('locale')
    .isString()
    .custom((value) => LOCALES.includes(value))
    .optional(),
  catchError(async (req, res) => {
    const { form } = req
    const { locale } = req.query
    const fieldIds = form.get('fieldIds')
    const fieldDataList = await getFieldsDetail(fieldIds)
    const fields = fieldDataList
      .map((fieldData) => {
        const { variants, ...rest } = fieldData
        const localeFilterData = variants.filter((variantData) => {
          if (locale) {
            return variantData.locale === locale
          }
          return variantData.locale === rest.defaultLocale
        })
        return {
          ...rest,
          variant: localeFilterData[0],
        }
      })
      .filter((fieldData) => fieldData.active)
    res.json({
      id: form.id,
      title: form.get('title'),
      updatedAt: form.get('updatedAt'),
      fields,
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
