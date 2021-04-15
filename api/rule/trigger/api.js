const AV = require('leancloud-storage')
const { check } = require('express-validator')
const { Router } = require('express')

const { requireAuth, customerServiceOnly, catchError } = require('../../middleware')
const { Trigger } = require('./trigger')

const router = Router().use(requireAuth, customerServiceOnly)

router.post(
  '/',
  check('title').isString().isLength({ min: 1 }),
  check('description').isString().optional(),
  check('conditions').isObject().optional(),
  check('actions').isArray().optional(),
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
    res.json({ objectId: object.id })
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
  check('title').isString().isLength({ min: 1 }).optional(),
  check('description').isString().optional(),
  check('conditions').isObject().optional(),
  check('actions').isArray().optional(),
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
      object.set('conditions', conditions)
    }
    if (actions) {
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
  check('triggerIds').isArray(),
  check('triggerIds.*').isString(),
  catchError(async (req, res) => {
    const { triggerIds } = req.body
    const objects = triggerIds.map((id, index) => {
      const object = AV.Object.createWithoutData('Trigger', id)
      object.set('position', index)
      return object
    })
    if (objects.length) {
      await AV.Object.saveAll(objects, { useMasterKey: true })
    }
    res.json({})
  })
)

module.exports = router
