const AV = require('leancloud-storage')
const { check } = require('express-validator')
const { Router } = require('express')

const { requireAuth, customerServiceOnly, catchError } = require('../../middleware')
const { ticketOpenedStatuses } = require('../../../lib/common')
const { Context } = require('../context')
const { Automation } = require('./automation')

const router = Router().use(requireAuth, customerServiceOnly)

router.post(
  '/',
  check('title').isString().isLength({ min: 1 }),
  check('conditions').isObject().optional(),
  check('actions').isArray().optional(),
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
  check('title').isString().isLength({ min: 1 }).optional(),
  check('conditions').isObject().optional(),
  check('actions').isArray().optional(),
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
  check('automationIds').isArray({ min: 1 }),
  check('automationIds.*').isString(),
  catchError(async (req, res) => {
    const { automationIds } = req.body
    const objects = automationIds.map((id, index) => {
      const object = AV.Object.createWithoutData('Automation', id)
      object.set('position', index)
      return object
    })
    await AV.Object.saveAll(objects, { useMasterKey: true })
    res.json({})
  })
)

router.post(
  '/preview',
  check('conditions').isObject(),
  catchError(async (req, res) => {
    const query = new AV.Query('Ticket')
    query.containedIn('status', ticketOpenedStatuses())
    query.limit(1000)
    query.addAscending('createdAt')
    const tickets = await query.find({ useMasterKey: true })
    const conditions = Automation.parseConditions(req.body.conditions)
    const matchedTicketIds = []
    tickets.forEach((ticket) => {
      const ctx = new Context(ticket.toJSON())
      if (conditions.test(ctx)) {
        matchedTicketIds.push(ticket.id)
      }
    })
    res.json({ matchedTicketIds })
  })
)

module.exports = router
