const AV = require('leancloud-storage')
const { Router } = require('express')
const { query } = require('express-validator')

const { catchError, parseSearchingQ, requireAuth, customerServiceOnly } = require('../middleware')
const { encodeFileObject } = require('./utils')

const router = Router()

router.get(
  '/',
  parseSearchingQ,
  query('id').isString().isLength({ min: 1 }),
  catchError(async (req, res) => {
    const { id } = req.query
    const query = new AV.Query('_File')
    query.containedIn('objectId', id.split(','))
    const files = await query.find()
    res.json(files.map(encodeFileObject))
  })
)

router.param(
  'id',
  catchError(async (req, res, next, id) => {
    req.file = await new AV.Query('_File').get(id)
    next()
  })
)

router.get('/:id', (req, res) => {
  res.json(encodeFileObject(req.file))
})

router.get('/:id/redirection', (req, res) => {
  res.redirect(req.file.get('url'))
})

router.delete(
  '/:id',
  requireAuth,
  customerServiceOnly,
  catchError(async (req, res) => {
    await req.file.destroy({ useMasterKey: true })
    res.json({})
  })
)

module.exports = router
