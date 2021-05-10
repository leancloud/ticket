const AV = require('leancloud-storage')
const { Router } = require('express')
const { query } = require('express-validator')

const { requireAuth, catchError } = require('../middleware')

const router = Router().use(requireAuth)

router.get(
  '/',
  query('active').isBoolean().optional(),
  query('ids').isString().optional(),
  catchError(async (req, res) => {
    const { active, ids } = req.query
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

    const categories = await query.find()
    res.json(
      categories.map((category) => {
        return {
          id: category.id,
          name: category.get('name'),
          description: category.get('description') || '',
          parent_id: category.get('parent')?.id || '',
          position: category.get('order') ?? category.createdAt.getTime(),
          template: category.get('qTemplate') || '',
          faq_ids: category.get('faqs')?.map((faq) => faq.id) || [],
          active: !category.get('deletedAt'),
          created_at: category.createdAt,
          updated_at: category.updatedAt,
        }
      })
    )
  })
)

module.exports = router
