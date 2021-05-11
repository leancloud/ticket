const AV = require('leanengine')
const { Router } = require('express')
const { query } = require('express-validator')

const { requireAuth, catchError, customerServiceOnly } = require('../middleware')
const { encodeUserObject } = require('./utils')

const router = Router().use(requireAuth)

router.get(
  '/',
  customerServiceOnly,
  query('ids').isString().isLength({ min: 1 }),
  catchError(async (req, res) => {
    const ids = req.query.ids.split(',')
    const query = new AV.Query('_User')
    query.containedIn('objectId', ids)
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
