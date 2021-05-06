const AV = require('leanengine')
const { Router } = require('express')
const { check, query } = require('express-validator')

const { checkPermission } = require('../oauth')
const { requireAuth, catchError } = require('../middleware')
const {
  selectAssignee,
  getVacationerIds,
  getTinyCategoryInfo,
  saveWithoutHooks,
  getActionStatus,
  addOpsLog,
} = require('./utils')
const { isCustomerService, getTinyUserInfo, htmlify, getTinyReplyInfo } = require('../common')
const { TICKET_ACTION, TICKET_STATUS, ticketStatus, getTicketAcl } = require('../../lib/common')
const { afterSaveTicketHandler, afterUpdateTicketHandler } = require('./hook-handler')
const { getReplyAcl } = require('../Reply')
const notification = require('../notification')
const { invokeWebhooks } = require('../webhook')

const router = Router().use(requireAuth)

function getWatchObject(user, ticket) {
  return new AV.Query('Watch')
    .select('objectId')
    .equalTo('user', user)
    .equalTo('ticket', ticket)
    .first({ useMasterKey: true })
}

function makeFilePointer({ objectId }) {
  return {
    __type: 'Pointer',
    className: '_File',
    objectId,
  }
}

router.post(
  '/',
  check('title').isString().trim().isLength({ min: 1 }),
  check('categoryId').isString(),
  check('content').isString(),
  check('organizationId').isString().optional(),
  check('files').isArray().optional(),
  check('files.*.objectId').isString(),
  catchError(async (req, res) => {
    if (!(await checkPermission(req.user))) {
      res.throw(403, 'Your account is not qualified to create ticket.')
    }

    const { title, categoryId, content, organizationId, files = [] } = req.body
    const author = req.user
    const organization = organizationId
      ? AV.Object.createWithoutData('Organization', organizationId)
      : undefined
    const [assignee, categoryInfo] = await Promise.all([
      selectAssignee(categoryId),
      getTinyCategoryInfo(categoryId),
    ])

    const ticket = new AV.Object('Ticket')
    ticket.setACL(new AV.ACL(getTicketAcl(author, organization)))
    ticket.set('status', TICKET_STATUS.NEW)
    ticket.set('title', title)
    ticket.set('author', author)
    ticket.set('assignee', assignee)
    ticket.set('category', categoryInfo)
    ticket.set('content', content)
    ticket.set('content_HTML', htmlify(content))
    ticket.set('files', files.map(makeFilePointer))
    if (organization) {
      ticket.set('organization', organization)
    }

    await saveWithoutHooks(ticket, {
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
    })
    afterSaveTicketHandler(ticket, { skipFetchAuthorAndAssignee: true })

    res.json({ objectId: ticket.id })
  })
)

router.param(
  'id',
  catchError(async (req, res, next, id) => {
    if (!/^\d+$/.test(id)) {
      res.throw(400, 'Invalid nid')
    }
    const query = new AV.Query('Ticket').equalTo('nid', parseInt(id))
    req.ticket = await query.first({ user: req.user })
    if (!req.ticket) {
      res.throw(404, 'Ticket not found')
    }
    next()
  })
)

router.get(
  '/:id',
  catchError(async (req, res) => {
    /**
     * @type {AV.Object}
     */
    const ticket = req.ticket
    const [isCS, watch] = await Promise.all([
      isCustomerService(req.user),
      getWatchObject(req.user, ticket),
      ticket.fetch(
        { include: ['author', 'assignee', 'files', 'organization'] },
        { useMasterKey: true }
      ),
    ])

    res.json({
      ticket: {
        objectId: ticket.id,
        nid: ticket.get('nid'),
        title: ticket.get('title'),
        author: ticket.get('author'),
        organization: ticket.get('organization'),
        assignee: ticket.get('assignee'),
        category: ticket.get('category'),
        content: ticket.get('content'),
        content_HTML: ticket.get('content_HTML'),
        files: ticket.get('files') || [],
        evaluation: ticket.get('evaluation') || null,
        joinedCustomerService: ticket.get('joinedCustomerService') || [],
        status: ticket.get('status'),
        tags: ticket.get('tags') || [],
        privateTags: isCS ? ticket.get('privateTags') || [] : undefined,
        metaData: ticket.get('metaData'),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
      subscribed: !!watch,
    })

    try {
      const messages = await new AV.Query('Message')
        .equalTo('ticket', ticket)
        .equalTo('to', req.user)
        .lessThanOrEqualTo('createdAt', new Date())
        .limit(1000)
        .find({ user: req.user })
      if (messages.length) {
        messages.forEach((message) => message.set('isRead', true))
        await AV.Object.saveAll(messages, { user: req.user })
      }
    } catch {
      // ignore errors
    }
  })
)

router.get(
  '/:id/replies',
  query('page.after').isString().optional(),
  catchError(async (req, res) => {
    const { page } = req.query
    const query = new AV.Query('Reply')
      .equalTo('ticket', req.ticket)
      .include('author', 'files')
      .ascending('objectId')
      .limit(500)
    if (page?.after) {
      query.greaterThan('objectId', page.after)
    }
    const replies = await query.find({ useMasterKey: true })
    res.json({
      replies: replies.map((reply) => ({
        objectId: reply.id,
        nid: reply.get('nid'),
        author: reply.get('author'),
        content: reply.get('content'),
        content_HTML: reply.get('content_HTML'),
        files: reply.get('files') || [],
        isCustomerService: reply.get('isCustomerService'),
        createdAt: reply.createdAt,
      })),
    })
  })
)

router.post(
  '/:id/replies',
  check('content').isString(),
  check('files').isArray().optional(),
  check('files.*.objectId').isString(),
  catchError(async (req, res) => {
    /**
     * @type {AV.Object}
     */
    const ticket = req.ticket
    const { content, files = [] } = req.body
    const author = req.user
    const reply = new AV.Object('Reply')
    const isCS = await isCustomerService(author, ticket.get('author'))
    reply.setACL(getReplyAcl(ticket, author))
    reply.set('ticket', ticket)
    reply.set('author', author)
    reply.set('content', content)
    reply.set('content_HTML', htmlify(content))
    reply.set('files', files.map(makeFilePointer))
    reply.set('isCustomerService', isCS)

    await saveWithoutHooks(reply, {
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
    })
    res.json({})

    const [replyInfo, authorInfo] = await Promise.all([
      getTinyReplyInfo(reply),
      getTinyUserInfo(author),
      ticket.fetch({ include: ['author', 'assignee'] }, { useMasterKey: true }),
    ])
    ticket.set('latestReply', replyInfo)
    ticket.increment('replyCount', 1)
    ticket.updatedKeys = ['latestReply', 'replyCount']

    if (isCS) {
      ticket.addUnique('joinedCustomerService', authorInfo)
      ticket.set('status', TICKET_STATUS.WAITING_CUSTOMER)
      ticket.increment('unreadCount')
      ticket.updatedKeys.push('joinedCustomerServices', 'status', 'unreadCount')
    } else {
      ticket.set('status', TICKET_STATUS.WAITING_CUSTOMER_SERVICE)
      ticket.updatedKeys.push('status')
    }

    await saveWithoutHooks(ticket, {
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
      useMasterKey: true,
    })
    afterUpdateTicketHandler(ticket, {
      user: author,
    })
    notification.replyTicket(ticket, reply, author)
    invokeWebhooks('reply.create', { reply: reply.toJSON() })
  })
)

router.get(
  '/:id/ops-logs',
  query('page.after').isString().optional(),
  catchError(async (req, res) => {
    const { page } = req.query
    const query = new AV.Query('OpsLog')
      .equalTo('ticket', req.ticket)
      .ascending('objectId')
      .limit(500)
    if (page?.after) {
      query.greaterThan('objectId', page.after)
    }
    const opsLogs = await query.find({ useMasterKey: true })
    res.json({
      opsLogs: opsLogs.map((opsLog) => ({
        objectId: opsLog.id,
        action: opsLog.get('action'),
        data: opsLog.get('data'),
        createdAt: opsLog.createdAt,
      })),
    })
  })
)

router.put(
  '/:id/evaluation',
  check('star').isInt().isIn([0, 1]),
  check('content').isString(),
  catchError(async (req, res) => {
    /**
     * @type {AV.Object}
     */
    const ticket = req.ticket
    if (ticket.has('evaluation')) {
      res.throw(409, 'Evaluation already exists')
    }

    const { star, content } = req.body
    ticket.set('evaluation', { star, content })
    await saveWithoutHooks(ticket, {
      ignoreBeforeHook: true,
      useMasterKey: true,
    })
    res.json({})
  })
)

router.patch(
  '/:id',
  check('assigneeId').isString().optional(),
  check('categoryId').isString().optional(),
  catchError(async (req, res) => {
    const { assigneeId, categoryId } = req.body
    /**
     * @type {AV.Object}
     */
    const ticket = req.ticket
    ticket.updatedKeys = []

    const isCS = await isCustomerService(req.user)
    if (!isCS) {
      res.throw(403, 'Forbidden')
    }

    if (assigneeId) {
      const vacationerIds = await getVacationerIds()
      if (vacationerIds.includes(assigneeId)) {
        res.throw(400, 'Sorry, this customer service is in vacation.')
      }
      const assignee = await new AV.Query('_User').get(assigneeId)
      ticket.set('assignee', assignee)
      ticket.updatedKeys.push('assignee')
    }

    if (categoryId) {
      const categoryInfo = await getTinyCategoryInfo(categoryId)
      ticket.set('category', categoryInfo)
      ticket.updatedKeys.push('category')
    }

    await saveWithoutHooks(ticket, {
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
      useMasterKey: true,
    })
    afterUpdateTicketHandler(ticket, {
      user: req.user,
      skipFetchAssignee: !!assigneeId,
    })
    res.json({})
  })
)

router.post(
  '/:id/subscription',
  catchError(async (req, res) => {
    const { user, ticket } = req
    const watch = await getWatchObject(user, ticket)
    if (!watch) {
      await new AV.Object('Watch', {
        ACL: { [user.id]: { read: true, write: true } },
        user,
        ticket,
      }).save()
    }
    res.json({})
  })
)

router.delete(
  '/:id/subscription',
  catchError(async (req, res) => {
    const { user, ticket } = req
    const watch = await getWatchObject(user, ticket)
    if (!watch) {
      return res.throw(404)
    }
    await watch.destroy({ useMasterKey: true })
    res.json({})
  })
)

router.put(
  '/:id/tags',
  check('tags').isArray(),
  check('tags.*.key').isString().isLength({ min: 1 }),
  check('tags.*.value').isString(),
  check('isPrivate').isBoolean().optional(),
  catchError(async (req, res) => {
    /**
     * @type {AV.Object}
     */
    const ticket = req.ticket
    const { tags, isPrivate } = req.body
    ticket.set(isPrivate ? 'privateTags' : 'tags', tags)
    await saveWithoutHooks(ticket, {
      ignoreBeforeHook: true,
      useMasterKey: true,
    })
    res.json({})
  })
)

router.post(
  '/:id/operate',
  check('action')
    .isString()
    .custom((action) => Object.values(TICKET_ACTION).includes(action)),
  catchError(async (req, res) => {
    /**
     * @type {AV.Object}
     */
    const ticket = req.ticket
    const { action } = req.body
    const [isCS, operatorInfo] = await Promise.all([
      isCustomerService(req.user, ticket.get('author')),
      getTinyUserInfo(req.user),
    ])

    const status = getActionStatus(action, isCS)
    if (isCS) {
      ticket.addUnique('joinedCustomerServices', operatorInfo)
      if (ticketStatus.isOpened(status) !== ticketStatus.isOpened(ticket.get('status'))) {
        ticket.increment('unreadCount')
      }
    }

    ticket.set('status', status)
    await saveWithoutHooks(ticket, {
      ignoreBeforeHook: true,
      useMasterKey: true,
    })
    await addOpsLog(ticket, action, { operator: operatorInfo })
    res.json({})
  })
)

module.exports = router
