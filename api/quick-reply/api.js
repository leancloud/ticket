const AV = require('leanengine')
const { Router } = require('express')
const { check, query } = require('express-validator')

const { requireAuth, catchError, customerServiceOnly } = require('../middleware')

const router = Router().use(requireAuth).use(customerServiceOnly)

router.post(
  '/',
  check('name').isString().trim().isLength({ min: 1 }),
  check('owner_id').isString().optional(),
  check('content').isString().trim().isLength({ min: 1 }),
  check('file_ids.*').isString().optional(),
  catchError(async (req, res) => {
    const { name, owner_id, content, file_ids } = req.body
    const obj = new AV.Object('QuickReply', {
      ACL: { 'role:customerService': { read: true, write: true } },
      name,
      content,
    })
    if (owner_id) {
      const owner = await new AV.Query('_User').get(owner_id)
      obj.set('owner', owner)
    }
    if (file_ids) {
      obj.set(
        'files',
        file_ids.map((id) => AV.Object.createWithoutData('_File', id))
      )
    }
    await obj.save(null, { useMasterKey: true })
    res.json({ id: obj.id })
  })
)

router.get(
  '/',
  query('owner_id').isString().trim().optional(),
  catchError(async (req, res) => {
    const { owner_id } = req.query
    let query = new AV.Query('QuickReply')
    if (owner_id) {
      query.equalTo('owner', AV.Object.createWithoutData('_User', owner_id))
    } else {
      query.doesNotExist('owner')
      if (owner_id === undefined) {
        query = AV.Query.or(query, new AV.Query('QuickReply').equalTo('owner', req.user))
      }
    }
    const quickReplies = await query.find({ useMasterKey: true })
    res.json(
      quickReplies.map((reply) => ({
        id: reply.id,
        name: reply.get('name'),
        content: reply.get('content'),
        owner_id: reply.get('owner')?.id || '',
        file_ids: reply.get('files')?.map((file) => file.id) || [],
        created_at: reply.createdAt,
      }))
    )
  })
)

router.param(
  'id',
  catchError(async (req, res, next, id) => {
    req.quickReply = await new AV.Query('QuickReply').get(id, { useMasterKey: true })
    next()
  })
)

router.get('/:id', (req, res) => {
  /**
   * @type {AV.Object}
   */
  const quickReply = req.quickReply
  res.json({
    id: quickReply.id,
    name: quickReply.get('name'),
    owner_id: quickReply.get('owner')?.id || '',
    content: quickReply.get('content'),
    file_ids: quickReply.get('files')?.map((file) => file.id) || [],
    created_at: quickReply.createdAt,
  })
})

router.patch(
  '/:id',
  check('name').isString().trim().isLength({ min: 1 }).optional(),
  check('owner_id').isString().optional(),
  check('content').isString().trim().isLength({ min: 1 }).optional(),
  check('file_ids.*').isString().optional(),
  catchError(async (req, res) => {
    const { name, owner_id, content, file_ids } = req.body
    /**
     * @type {AV.Object}
     */
    const quickReply = req.quickReply

    if (name) {
      quickReply.set('name', name)
    }

    if (owner_id !== undefined) {
      if (owner_id === '') {
        quickReply.unset('owner')
      } else {
        const owner = await new AV.Query('_User').get(owner_id)
        quickReply.set('owner', owner)
      }
    }

    if (content) {
      quickReply.set('content', content)
    }

    if (file_ids) {
      quickReply.set(
        'files',
        file_ids.map((id) => AV.Object.createWithoutData('_File', id))
      )
    }

    await quickReply.save(null, { useMasterKey: true })
    res.json({})
  })
)

router.delete(
  '/:id',
  catchError(async (req, res) => {
    const quickReply = req.quickReply
    await quickReply.destroy({ useMasterKey: true })
    res.json({})
  })
)

module.exports = router
