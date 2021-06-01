const AV = require('leancloud-storage')
const { check } = require('express-validator')
const { Router } = require('express')

const { requireAuth, customerServiceOnly, catchError } = require('../../middleware')
const { Trigger } = require('.')

const router = Router().use(requireAuth, customerServiceOnly)

router.post(
  '/',
  check('title').isString().trim().isLength({ min: 1 }),
  check('description').isString().trim().optional(),
  check('conditions').isObject().optional(),
  check('actions').isArray({ min: 1 }),
  catchError(async (req, res) => {
    const { title, description, conditions, actions } = req.body
    Trigger.parseConditions(conditions)
    Trigger.parseActions(actions)
    const object = await new AV.Object('Trigger', {
      ACL: {},
      title,
      description,
      conditions,
      actions,
      active: true,
    }).save(null, { useMasterKey: true })
    res.json({ id: object.id })
  })
)

router.get(
  '/',
  catchError(async (req, res) => {
    const query = new AV.Query('Trigger')
      .select('title', 'description', 'position', 'active')
      .addAscending('position')
      .addAscending('createdAt')
    const objects = await query.find({ useMasterKey: true })
    res.json(
      objects.map((o) => ({
        id: o.id,
        title: o.get('title'),
        description: o.get('description'),
        position: o.get('position'),
        active: !!o.get('active'),
      }))
    )
  })
)

router.get(
  '/:id',
  catchError(async (req, res) => {
    const { id } = req.params
    const object = await new AV.Query('Trigger').get(id, { useMasterKey: true })
    res.json(object.toJSON())
  })
)

router.patch(
  '/:id',
  check('title').isString().trim().isLength({ min: 1 }).optional(),
  check('description').isString().trim().optional(),
  check('conditions').isObject().optional(),
  check('actions').isArray({ min: 1 }).optional(),
  check('active').isBoolean().optional(),
  catchError(async (req, res) => {
    const { id } = req.params
    const { title, description, conditions, actions, active } = req.body
    const object = AV.Object.createWithoutData('Trigger', id)
    if (title !== undefined) {
      object.set('title', title)
    }
    if (description !== undefined) {
      object.set('description', description)
    }
    if (conditions) {
      Trigger.parseConditions(conditions)
      object.set('conditions', conditions)
    }
    if (actions) {
      Trigger.parseActions(actions)
      object.set('actions', actions)
    }
    if (active !== undefined) {
      object.set('active', active)
    }
    await object.save(null, { useMasterKey: true })
    res.json({})
  })
)

router.delete(
  '/:id',
  catchError(async (req, res) => {
    const { id } = req.params
    const object = AV.Object.createWithoutData('Trigger', id)
    await object.destroy({ useMasterKey: true })
    res.json({})
  })
)

router.post(
  '/reorder',
  check('trigger_ids').isArray({ min: 1 }),
  check('trigger_ids.*').isString(),
  catchError(async (req, res) => {
    const { trigger_ids } = req.body
    const objects = trigger_ids.map((id, index) => {
      const object = AV.Object.createWithoutData('Trigger', id)
      object.set('position', index)
      return object
    })
    await AV.Object.saveAll(objects, { useMasterKey: true })
    res.json({})
  })
)

module.exports = router
