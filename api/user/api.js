const AV = require('leanengine')
const { Router } = require('express')
const { query } = require('express-validator')

const { requireAuth, catchError, customerServiceOnly, parseSearchingQ } = require('../middleware')
const { encodeUserObject } = require('./utils')

const router = Router().use(requireAuth)

router.get(
  '/',
  customerServiceOnly,
  parseSearchingQ,
  query('id').isString().isLength({ min: 1 }),
  catchError(async (req, res) => {
    const { id } = req.query
    const query = new AV.Query('_User')
    const ids = id.split(',')
    if (ids.length > 1) {
      query.containedIn('objectId', ids)
    } else {
      query.equalTo('objectId', ids[0])
    }
    const users = await query.find({ useMasterKey: true })
    res.json(users.map(encodeUserObject))
  })
)

router.param(
  'id',
  catchError(async (req, res, next, id) => {
    if (id === req.user.id) {
      req.targetUser = req.user
    } else {
      req.targetUser = await new AV.Query('_User').get(id, { user: req.user })
    }
    next()
  })
)

router.get('/:id', (req, res) => {
  res.json(encodeUserObject(req.targetUser))
})

module.exports = router
