const AV = require('leanengine')
const { Router } = require('express')
const { check, query } = require('express-validator')

const { checkPermission } = require('../oauth')
const { requireAuth, catchError, customerServiceOnly } = require('../middleware')
const {
  addOpsLog,
  getActionStatus,
  getTinyCategoryInfo,
  getVacationerIds,
  saveWithoutHooks,
  selectAssignee,
} = require('./utils')
const { getReplyAcl } = require('../Reply')
const { htmlify, isCustomerService } = require('../common')
const { TICKET_ACTION, TICKET_STATUS, ticketStatus, getTicketAcl } = require('../../lib/common')
const { afterSaveTicketHandler, afterUpdateTicketHandler } = require('./hook-handler')
const notification = require('../notification')
const { invokeWebhooks } = require('../webhook')

const EMPTY_STRINGS = ['', "''", '""']

const TICKET_SORT_KEY_MAP = {
  created_at: 'createdAt',
}

const router = Router().use(requireAuth)

function getWatchObject(user, ticket) {
  return new AV.Query('Watch')
    .select('objectId')
    .equalTo('user', user)
    .equalTo('ticket', ticket)
    .first({ useMasterKey: true })
}

function makeFilePointer(objectId) {
  return { __type: 'Pointer', className: '_File', objectId }
}

function getTinyUserInfo(user) {
  return {
    objectId: user.id,
    username: user.get('username'),
    name: user.get('name'),
    email: user.get('email'),
  }
}

router.post(
  '/',
  check('title').isString().trim().isLength({ min: 1 }),
  check('category_id').isString(),
  check('content').isString(),
  check('organization_id').isString().optional(),
  check('file_ids').default([]).isArray(),
  check('file_ids.*').isString(),
  catchError(async (req, res) => {
    if (!(await checkPermission(req.user))) {
      res.throw(403, 'Your account is not qualified to create ticket.')
    }

    const { title, category_id, content, organization_id, file_ids } = req.body
    const author = req.user
    const organization = organization_id
      ? AV.Object.createWithoutData('Organization', organization_id)
      : undefined
    const [assignee, categoryInfo] = await Promise.all([
      selectAssignee(category_id),
      getTinyCategoryInfo(category_id),
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
    ticket.set('files', file_ids.map(makeFilePointer))
    if (organization) {
      ticket.set('organization', organization)
    }

    await saveWithoutHooks(ticket, {
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
    })
    afterSaveTicketHandler(ticket, { skipFetchAuthorAndAssignee: true })

    res.json({ id: ticket.id })
  })
)

router.get(
  '/',
  query('page')
    .default(1)
    .isInt()
    .toInt()
    .custom((page) => page > 0),
  query('page_size')
    .default(10)
    .isInt()
    .toInt()
    .custom((page_size) => page_size >= 0),
  query('sort_key').default('created_at').isIn(Object.keys(TICKET_SORT_KEY_MAP)),
  query('sort_order').default('asc').isIn(['asc', 'desc']),
  query('nid').isInt().toInt().optional(),
  query('author_id').isString().isLength({ min: 1 }).optional(),
  query('organization_id').isString().optional(),
  catchError(async (req, res) => {
    const { page, page_size } = req.query
    const { sort_key, sort_order } = req.query
    const { nid, author_id, organization_id } = req.query

    let query = new AV.Query('Ticket')

    if (nid !== undefined) {
      query.equalTo('nid', nid)
    }
    if (author_id) {
      query.equalTo('author', AV.Object.createWithoutData('_User', author_id))
    }
    if (organization_id !== undefined) {
      if (EMPTY_STRINGS.includes(organization_id)) {
        const orgQuery = AV.Query.or(
          new AV.Query('Ticket').equalTo('organization', null),
          new AV.Query('Ticket').doesNotExist('organization')
        )
        query = AV.Query.and(query, orgQuery)
      } else {
        query.equalTo('organization', AV.Object.createWithoutData('Organization', organization_id))
      }
    }

    query.select(
      'nid',
      'title',
      'author',
      'organization',
      'assignee',
      'category',
      'joinedCustomerServices',
      'status'
    )
    if (sort_order === 'asc') {
      query.ascending(TICKET_SORT_KEY_MAP[sort_key])
    } else {
      query.descending(TICKET_SORT_KEY_MAP[sort_key])
    }
    query.limit(page)
    if (page > 1) {
      query.skip((page - 1) * page_size)
    }

    const tickets = page_size ? await query.find({ user: req.user }) : []
    res.json({
      tickets: tickets.map((ticket) => {
        const joinedCustomerServiceIds = new Set()
        ticket.get('joinedCustomerServices')?.forEach((user) => {
          joinedCustomerServiceIds.add(user.objectId)
        })
        return {
          id: ticket.id,
          nid: ticket.get('nid'),
          title: ticket.get('title'),
          author_id: ticket.get('author').id,
          organization_id: ticket.get('organization')?.id || '',
          assignee_id: ticket.get('assignee').id,
          category_id: ticket.get('category').objectId,
          joined_customer_service_ids: Array.from(joinedCustomerServiceIds),
          status: ticket.get('status'),
          created_at: ticket.createdAt,
          updated_at: ticket.updatedAt,
        }
      }),
    })
  })
)

router.param(
  'id',
  catchError(async (req, res, next, id) => {
    req.ticket = await new AV.Query('Ticket').get(id, { user: req.user })
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
    ])
    if (isCS) {
      await ticket.fetch({ keys: ['privateTags'] }, { useMasterKey: true })
    }

    res.json({
      ticket: {
        id: ticket.id,
        nid: ticket.get('nid'),
        title: ticket.get('title'),
        author_id: ticket.get('author').id,
        organization_id: ticket.get('organization')?.id || '',
        assignee_id: ticket.get('assignee').id,
        category_id: ticket.get('category').objectId,
        content: ticket.get('content'),
        content_HTML: ticket.get('content_HTML'),
        file_ids: ticket.get('files')?.map((file) => file.id) || [],
        evaluation: ticket.get('evaluation') || null,
        joined_customer_service_ids:
          ticket.get('joinedCustomerServices')?.map((user) => user.objectId) || [],
        status: ticket.get('status'),
        tags: ticket.get('tags') || [],
        private_tags: ticket.get('privateTags'),
        metadata: ticket.get('metaData') || {},
        created_at: ticket.createdAt,
        updated_at: ticket.updatedAt,
        subscribed: !!watch,
      },
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

/**
 * @param {AV.Object} reply
 */
function encodeReplyObject(reply) {
  return {
    id: reply.id,
    nid: reply.get('nid'),
    author_id: reply.get('author').id,
    content: reply.get('content'),
    content_HTML: reply.get('content_HTML'),
    file_ids: reply.get('files')?.map((file) => file.id) || [],
    is_customer_service: !!reply.get('isCustomerService'),
    created_at: reply.createdAt,
  }
}

router.get(
  '/:id/replies',
  query('cursor').isString().optional(),
  catchError(async (req, res) => {
    const { cursor } = req.query
    const query = new AV.Query('Reply')
      .equalTo('ticket', req.ticket)
      .ascending('objectId')
      .limit(500)
    if (cursor) {
      query.greaterThan('objectId', cursor)
    }
    const replies = await query.find({ useMasterKey: true })
    res.json({
      replies: replies.map(encodeReplyObject),
      cursor: replies.length ? replies[replies.length - 1].id : undefined,
    })
  })
)

router.post(
  '/:id/replies',
  check('content').isString(),
  check('file_ids').default([]).isArray(),
  check('file_ids.*').isString(),
  catchError(async (req, res) => {
    /**
     * @type {AV.Object}
     */
    const ticket = req.ticket
    const { content, file_ids } = req.body
    const author = req.user
    const reply = new AV.Object('Reply')
    const isCS = await isCustomerService(author, ticket.get('author'))
    reply.setACL(getReplyAcl(ticket, author))
    reply.set('ticket', ticket)
    reply.set('author', author)
    reply.set('content', content)
    reply.set('content_HTML', htmlify(content))
    reply.set('files', file_ids.map(makeFilePointer))
    reply.set('isCustomerService', isCS)

    await saveWithoutHooks(reply, {
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
    })
    res.json(encodeReplyObject(reply))

    await ticket.fetch({ include: ['author', 'assignee'] }, { useMasterKey: true })
    const authorInfo = getTinyUserInfo(author)
    ticket.set('latestReply', {
      author: authorInfo,
      content,
      isCustomerService: isCS,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
    })
    ticket.increment('replyCount', 1)
    ticket.updatedKeys = ['latestReply', 'replyCount']

    if (isCS) {
      ticket.addUnique('joinedCustomerServices', authorInfo)
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
  query('cursor').isString().optional(),
  catchError(async (req, res) => {
    const { cursor } = req.query
    const query = new AV.Query('OpsLog')
      .equalTo('ticket', req.ticket)
      .ascending('objectId')
      .limit(500)
    if (cursor) {
      query.greaterThan('objectId', cursor)
    }
    const opsLogs = await query.find({ useMasterKey: true })
    res.json({
      ops_logs: opsLogs.map((opsLog) => {
        const log = {
          id: opsLog.id,
          action: opsLog.get('action'),
          created_at: opsLog.createdAt,
        }
        const data = opsLog.get('data')
        if (data.assignee) {
          log.assignee_id = data.assignee.objectId
        }
        if (data.operator) {
          log.operator_id = data.operator.objectId
        }
        if (data.category) {
          log.category_id = data.category.objectId
        }
        return log
      }),
      cursor: opsLogs.length ? opsLogs[opsLogs.length - 1].id : undefined,
    })
  })
)

router.patch(
  '/:id',
  customerServiceOnly,
  check('assignee_id').isString().optional(),
  check('category_id').isString().optional(),
  check('organization_id').isString().optional(),
  check('tags').isArray().optional(),
  check('tags.*.key').isString(),
  check('tags.*.value').isString(),
  check('private_tags').isArray().optional(),
  check('private_tags.*.key').isString(),
  check('private_tags.*.value').isString(),
  check('evaluation')
    .isObject()
    .optional()
    .custom((evaluation) => {
      return (
        Object.keys(evaluation).length === 2 &&
        (evaluation.star === 0 || evaluation.star === 1) &&
        typeof evaluation.content === 'string'
      )
    }),
  check('subscribed').isBoolean().optional(),
  catchError(async (req, res) => {
    const {
      assignee_id,
      category_id,
      organization_id,
      tags,
      private_tags,
      evaluation,
      subscribed,
    } = req.body
    /**
     * @type {AV.Object}
     */
    const ticket = req.ticket
    ticket.updatedKeys = []

    const isCS = await isCustomerService(req.user)

    if (assignee_id) {
      if (!isCS) {
        res.throw(403, 'Forbidden')
      }
      const vacationerIds = await getVacationerIds()
      if (vacationerIds.includes(assignee_id)) {
        res.throw(400, 'Sorry, this customer service is in vacation.')
      }
      const assignee = await new AV.Query('_User').get(assignee_id)
      ticket.set('assignee', assignee)
      ticket.updatedKeys.push('assignee')
    }

    if (category_id) {
      if (!isCS) {
        res.throw(403, 'Forbidden')
      }
      const categoryInfo = await getTinyCategoryInfo(category_id)
      ticket.set('category', categoryInfo)
      ticket.updatedKeys.push('category')
    }

    if (organization_id !== undefined) {
      const organization = AV.Object.createWithoutData('Organization', organization_id)
      ticket.setACL(new AV.ACL(getTicketAcl(ticket.get('author'), organization)))
      ticket.set('organization', organization)
      ticket.updatedKeys.push('organization')
    }

    if (tags) {
      if (!isCS) {
        res.throw(403, 'Forbidden')
      }
      ticket.set(
        'tags',
        tags.map((tag) => ({ key: tag.key, value: tag.value }))
      )
      ticket.updatedKeys.push('tags')
    }

    if (private_tags) {
      if (!isCS) {
        res.throw(403, 'Forbidden')
      }
      ticket.set(
        'privateTags',
        private_tags.map((tag) => ({ key: tag.key, value: tag.value }))
      )
      ticket.updatedKeys.push('privateTags')
    }

    if (evaluation) {
      if (req.user.id !== ticket.get('author').id) {
        res.throw(403)
      }
      if (ticket.has('evaluation')) {
        res.throw(409, 'Evaluation already exists')
      }
      ticket.set('evaluation', { star: evaluation.star, content: evaluation.content })
      ticket.updatedKeys.push('evaluation')
    }

    if (subscribed !== undefined) {
      if (!isCS) {
        res.throw(403, 'Forbidden')
      }
      const watch = await getWatchObject(req.user, ticket)
      if (subscribed && !watch) {
        await new AV.Object('Watch', {
          ACL: { [req.user.id]: { read: true, write: true } },
          user: AV.Object.createWithoutData('_User', req.user.id),
          ticket: AV.Object.createWithoutData('Ticket', ticket.id),
        }).save()
      }
      if (!subscribed && watch) {
        await watch.destroy({ user: req.user })
      }
    }

    await saveWithoutHooks(ticket, {
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
      useMasterKey: true,
    })
    afterUpdateTicketHandler(ticket, {
      user: req.user,
      skipFetchAssignee: !!assignee_id,
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
    const isCS = await isCustomerService(req.user, ticket.get('author'))
    const operatorInfo = getTinyUserInfo(req.user)

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
