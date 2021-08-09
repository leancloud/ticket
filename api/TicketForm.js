const AV = require('leancloud-storage')
const { Router } = require('express')
const { check } = require('express-validator')
const { requireAuth, customerServiceOnly, catchError } = require('./middleware')
const { responseAppendCount } = require('./utils')
const { LOCALES, getFieldsDetail } = require('./TicketField')
const router = Router().use(requireAuth)
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
        updated_at: o.get('updatedAt'),
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

const getLocale = (locale) => {
  if (!locale) {
    return
  }
  locale = locale.toLowerCase()
  if (locale === 'zh') {
    return 'zh-cn'
  }
  if (LOCALES.includes(locale)) {
    return locale
  }
  return
}

router.get(
  '/:id',

  catchError(async (req, res) => {
    const { form } = req
    const locale = getLocale(req.query.locale)
    const fieldIds = form.get('fieldIds')
    const fieldDataList = await getFieldsDetail(fieldIds)
    const fields = []
    fieldIds.forEach((fieldId) => {
      // 不过滤 title 和 description
      if (fieldId === 'title' || fieldId === 'description') {
        fields.push({
          id: fieldId,
        })
        return
      }
      const filterData = fieldDataList.filter((data) => data.active && data.id === fieldId)
      if (!filterData || !filterData[0]) {
        return
      }
      const { variants, ...rest } = filterData[0]
      const localeFilterData = variants.filter((variantData) => {
        if (locale) {
          return variantData.locale === locale
        }
        return variantData.locale === rest.defaultLocale
      })
      fields.push({
        ...rest,
        variant: localeFilterData[0],
      })
    })
    res.json({
      id: form.id,
      title: form.get('title'),
      updated_at: form.get('updatedAt'),
      fields,
    })
  })
)

router.post(
  '/',
  customerServiceOnly,
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
  customerServiceOnly,
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
