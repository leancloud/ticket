const AV = require('leancloud-storage')
const { check } = require('express-validator')
const { Router } = require('express')

const { requireAuth, customerServiceOnly, catchError } = require('../../middleware')
const { Automation } = require('.')

const router = Router().use(requireAuth, customerServiceOnly)

router.post(
  '/',
  check('title').isString().trim().isLength({ min: 1 }),
  check('conditions').isObject().optional(),
  check('actions').isArray({ min: 1 }),
  catchError(async (req, res) => {
    const { title, conditions, actions } = req.body
    Automation.parseConditions(conditions)
    Automation.parseActions(actions)
    const object = await new AV.Object('Automation', {
      ACL: {},
      title,
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
    const query = new AV.Query('Automation')
      .select('title', 'position', 'active')
      .addAscending('position')
      .addAscending('createdAt')
    const objects = await query.find({ useMasterKey: true })
    res.json(
      objects.map((o) => ({
        id: o.id,
        title: o.get('title'),
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
    const object = await new AV.Query('Automation').get(id, { useMasterKey: true })
    res.json(object.toJSON())
  })
)

router.patch(
  '/:id',
  check('title').isString().trim().isLength({ min: 1 }).optional(),
  check('conditions').isObject().optional(),
  check('actions').isArray({ min: 1 }).optional(),
  check('active').isBoolean().optional(),
  catchError(async (req, res) => {
    const { id } = req.params
    const { title, conditions, actions, active } = req.body
    const object = AV.Object.createWithoutData('Automation', id)
    if (title) {
      object.set('title', title)
    }
    if (conditions) {
      Automation.parseConditions(conditions)
      object.set('conditions', conditions)
    }
    if (actions) {
      Automation.parseActions(actions)
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
    const object = AV.Object.createWithoutData('Automation', id)
    await object.destroy({ useMasterKey: true })
    res.json({})
  })
)

router.post(
  '/reorder',
  check('automation_ids').isArray({ min: 1 }),
  check('automation_ids.*').isString(),
  catchError(async (req, res) => {
    const { automation_ids } = req.body
    const objects = automation_ids.map((id, index) => {
      const object = AV.Object.createWithoutData('Automation', id)
      object.set('position', index)
      return object
    })
    await AV.Object.saveAll(objects, { useMasterKey: true })
    res.json({})
  })
)

module.exports = router
