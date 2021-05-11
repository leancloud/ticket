const AV = require('leancloud-storage')
const { Router } = require('express')
const { query } = require('express-validator')

const { requireAuth, catchError } = require('../middleware')
const { encodeCategoryObject } = require('./utils')

const router = Router().use(requireAuth)

router.get(
  '/',
  query('active').isBoolean().optional(),
  query('ids').isString().optional(),
  query('parant_id').isString().optional(),
  catchError(async (req, res) => {
    const { active, ids, parent_id } = req.query
    const query = new AV.Query('Category')
    if (active === 'true') {
      query.doesNotExist('deletedAt')
    }
    if (active === 'false') {
      query.exists('deletedAt')
    }
    if (ids) {
      query.containedIn('objectId', ids.split(','))
    }
    if (parent_id !== undefined) {
      if (parent_id) {
        query.equalTo('parent', AV.Object.createWithoutData('Category', parent_id))
      } else {
        query.doesNotExist('parent')
      }
    }

    const categories = await query.find()
    res.json(categories.map(encodeCategoryObject))
  })
)

module.exports = router
