const AV = require('leancloud-storage')
const { Router } = require('express')
const { default: validator } = require('validator')

const { requireAuth, catchError, parseSearching } = require('../middleware')
const { encodeCategoryObject } = require('./utils')

const router = Router().use(requireAuth)

router.get(
  '/',
  parseSearching({
    active: {
      eq: validator.isBoolean,
    },
    id: {
      eq: null,
    },
    parent_id: {
      eq: null,
    },
  }),
  catchError(async (req, res) => {
    const q = req.q
    const query = new AV.Query('Category')
    if (q.active?.type === 'eq') {
      if (q.active.value === 'true') {
        query.doesNotExist('deletedAt')
      } else {
        query.exists('deletedAt')
      }
    }
    if (q.id?.type === 'eq') {
      const ids = q.id.value.split(',')
      if (ids.length > 1) {
        query.containedIn('objectId', ids)
      } else {
        query.equalTo('objectId', ids[0])
      }
    }
    if (q.parent_id?.type === 'eq') {
      if (q.parent_id.value) {
        query.equalTo('parent', AV.Object.createWithoutData('Category', q.parent_id.value))
      } else {
        query.doesNotExist('parent')
      }
    }

    const categories = await query.find()
    res.json(categories.map(encodeCategoryObject))
  })
)

module.exports = router
