const AV = require('leancloud-storage')
const { Router } = require('express')
const { query } = require('express-validator')

const { requireAuth, catchError, parseSearchingQ } = require('../middleware')
const { encodeCategoryObject } = require('./utils')

const router = Router().use(requireAuth)

router.get(
  '/',
  parseSearchingQ,
  query('active').isBoolean().optional(),
  query('id').isString().isLength({ min: 1 }).optional(),
  query('parent_id').isString().optional(),
  catchError(async (req, res) => {
    const { active, id, parent_id } = req.query
    const query = new AV.Query('Category')

    if (active === 'true') {
      query.doesNotExist('deletedAt')
    }
    if (active === 'false') {
      query.exists('deletedAt')
    }

    if (id) {
      const ids = id.split(',')
      if (ids.length > 1) {
        query.containedIn('objectId', ids)
      } else {
        query.equalTo('objectId', ids[0])
      }
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
