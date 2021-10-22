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
    const categoryQuery = new AV.Query('Category')
    categoryQuery.limit(1000)
    categoryQuery.addDescending('createdAt')
    if (active === 'true') {
      categoryQuery.doesNotExist('deletedAt')
    }
    if (active === 'false') {
      categoryQuery.exists('deletedAt')
    }
    if (id) {
      const ids = id.split(',')
      if (ids.length > 1) {
        categoryQuery.containedIn('objectId', ids)
      } else {
        categoryQuery.equalTo('objectId', ids[0])
      }
    }
    if (parent_id !== undefined) {
      if (parent_id) {
        categoryQuery.equalTo('parent', AV.Object.createWithoutData('Category', parent_id))
      } else {
        categoryQuery.doesNotExist('parent')
      }
    }
    const categories = await categoryQuery.find({
      useMasterKey: true,
    })
    res.json(categories.map(encodeCategoryObject))
  })
)

module.exports = router
