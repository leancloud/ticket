const { Router } = require('express')
const { check, query } = require('express-validator')
const { requireAuth, customerServiceOnly, catchError } = require('../middleware')
const { responseAppendCount } = require('../utils')
const formService = require('./Service').service
const router = Router().use(requireAuth)
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
  catchError(async (req, res) => {
    const { size, skip } = req.query
    const queryOptions = {
      size,
      skip,
    }
    const list = await formService.list(queryOptions)
    const count = await formService.count(queryOptions)
    res = responseAppendCount(res, count)
    res.json(list)
  })
)

router.get(
  '/:id',
  catchError(async (req, res) => {
    const formData = await formService.get(req.params.id)
    res.json(formData)
  })
)

router.post(
  '/',
  customerServiceOnly,
  check('title').isString().isLength({ min: 1 }),
  check('fieldIds').isArray().isLength({ min: 1 }),
  catchError(async (req, res) => {
    const { title, fieldIds } = req.body
    const result = await formService.add({
      title,
      fieldIds,
    })
    res.json(result)
  })
)

router.patch(
  '/:id',
  customerServiceOnly,
  check('title').isString().isLength({ min: 1 }),
  check('fieldIds').isArray().isLength({ min: 1 }),
  catchError(async (req, res) => {
    const { title, fieldIds } = req.body
    const result = await formService.update(req.params.id, {
      title,
      fieldIds,
    })
    res.json(result)
  })
)

router.delete(
  '/:id',
  customerServiceOnly,
  catchError(async (req, res) => {
    const result = await formService.delete(req.params.id)
    res.json(result)
  })
)

module.exports = router
