const AV = require('leanengine')
const { Router } = require('express')
const { query } = require('express-validator')

const { requireAuth, catchError, customerServiceOnly } = require('../middleware')

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
    res.json(
      users.map((user) => {
        return {
          id: user.id,
          nid: user.get('nid'),
          email: user.get('email') || '',
          username: user.get('username'),
          name: user.get('name') || '',
          tags: user.get('tags') || [],
        }
      })
    )
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

router.get(
  '/:id',
  catchError(async (req, res) => {
    /**
     * @type {AV.Object}
     */
    const user = req.targetUser
    res.json({
      id: user.id,
      nid: user.get('nid'),
      email: user.get('email') || '',
      username: user.get('username'),
      name: user.get('name') || '',
      tags: user.get('tags') || [],
    })
  })
)

module.exports = router
