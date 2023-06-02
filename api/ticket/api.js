const _ = require('lodash')
const AV = require('leanengine')
const { Router } = require('express')
const { check, query } = require('express-validator')

const { captureException } = require('../errorHandler')
const { checkPermission } = require('../../oauth/lc')
const { requireAuth, catchError, parseSearchingQ, customerServiceOnly } = require('../middleware')
const { getVacationerIds, getFormValuesDifference, resetUnreadCount } = require('./utils')
const { isObjectExists } = require('../utils/object')
const { encodeGroupObject } = require('../group/utils')
const { TICKET_ACTION, TICKET_STATUS } = require('../../lib/common')
const { encodeFileObject } = require('../file/utils')
const { encodeUserObject, makeTinyUserInfo } = require('../user/utils')
const { isCustomerService } = require('../customerService/utils')
const config = require('../../config')
const Ticket = require('./model')
const { getRoles } = require('../common')

const TICKET_SORT_KEY_MAP = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  status: 'status',
}

const router = Router().use(requireAuth)

function getWatchObject(user, ticket) {
  return new AV.Query('Watch')
    .select('objectId')
    .equalTo('user', user)
    .equalTo('ticket', ticket)
    .first({ useMasterKey: true })
}

function encodeLatestReply(latestReply) {
  if (!latestReply) {
    return null
  }
  return {
    author: {
      id: latestReply.author.objectId,
      username: latestReply.author.username,
      name: latestReply.author.name || '',
      email: latestReply.author.email || '',
    },
    content: latestReply.content,
    is_customer_service: latestReply.isCustomerService,
    created_at: latestReply.createdAt,
  }
}

/**
 * @param {AV.User | string} user
 */
async function isCSInTicket(user) {
  const userId = typeof user === 'string' ? user : user.id
  return await isCustomerService(userId)
}

router.post(
  '/',
  check('title').isString().trim().isLength({ min: 1 }),
  check('category_id').isString(),
  check('content').isString(),
  check('organization_id').isString().optional(),
  check('file_ids').default([]).isArray(),
  check('file_ids.*').isString(),
  check('metadata').isObject().optional(),
  check('form_values').isArray().optional(),
  catchError(async (req, res) => {
    if (!(await checkPermission(req.user))) {
      res.throw(403, 'Your account is not qualified to create ticket.')
    }

    const {
      title,
      category_id,
      content,
      organization_id,
      file_ids,
      metadata,
      form_values,
    } = req.body
    const author = req.user

    const ticket = await Ticket.create({
      title,
      category_id,
      author,
      content,
      file_ids,
      metadata,
      organization_id,
    })
    if (form_values) {
      await ticket.saveFormValues(form_values)
    }

    res.json({ id: ticket.id })
  })
)

router.get(
  '/',
  parseSearchingQ,
  query('page')
    .default(1)
    .isInt()
    .toInt()
    .custom((page) => page > 0),
  query('page_size')
    .default(10)
    .isInt()
    .toInt()
    .custom((page_size) => page_size >= 0 && page_size <= 1000),
  query('count').isBoolean().toBoolean().optional(),
  query('where').isJSON().optional(),
  query('nid').isInt().toInt().optional(),
  query('author_id').trim().isLength({ min: 1 }).optional(),
  query('organization_id').isString().optional(),
  query('category_id').isString().optional(),
  query(['created_at', 'created_at_gt', 'created_at_gte', 'created_at_lt', 'created_at_lte'])
    .isISO8601()
    .optional(),
  query('reply_count_gt').isInt().toInt().optional(),
  query('status')
    .custom((status) =>
      status.split(',').every((v) => Object.values(TICKET_STATUS).includes(parseInt(v)))
    )
    .optional(),
  query('evaluation_ne').isIn(['null']).optional(),
  catchError(async (req, res) => {
    const { page, page_size, count } = req.query
    const { nid, author_id, organization_id, category_id, status } = req.query
    const { created_at, created_at_gt, created_at_gte, created_at_lt, created_at_lte } = req.query
    const { reply_count_gt } = req.query

    const sort = req.sort
    if (!sort.every(({ key }) => !!TICKET_SORT_KEY_MAP[key])) {
      res.throw(400, 'Invalid sort key')
    }

    let query = new AV.Query('Ticket')
    if (req.query.where) {
      query._where = JSON.parse(req.query.where)
    }

    if (nid !== undefined) {
      query.equalTo('nid', nid)
    }
    if (author_id) {
      query.equalTo('author', AV.Object.createWithoutData('_User', author_id))
    }
    if (organization_id !== undefined) {
      if (organization_id === '') {
        const orgQuery = AV.Query.or(
          new AV.Query('Ticket').equalTo('organization', null),
          new AV.Query('Ticket').doesNotExist('organization')
        )
        query = AV.Query.and(query, orgQuery)
      } else {
        query.equalTo('organization', AV.Object.createWithoutData('Organization', organization_id))
      }
    }
    if (category_id) {
      query.equalTo('category.objectId', category_id)
    }
    if (status) {
      if (status.includes(',')) {
        query.containedIn(
          'status',
          status.split(',').map((v) => parseInt(v))
        )
      } else {
        query.equalTo('status', parseInt(status))
      }
    }

    if (created_at) {
      query.equalTo('createdAt', new Date(created_at))
    }
    if (created_at_gt) {
      query.greaterThan('createdAt', new Date(created_at_gt))
    }
    if (created_at_gte) {
      query.greaterThanOrEqualTo('createdAt', new Date(created_at_gte))
    }
    if (created_at_lt) {
      query.lessThan('createdAt', new Date(created_at_lt))
    }
    if (created_at_lte) {
      query.lessThanOrEqualTo('createdAt', new Date(created_at_lte))
    }

    if (reply_count_gt !== undefined) {
      query.greaterThan('replyCount', reply_count_gt)
    }

    if (req.query.evaluation_ne === 'null') {
      query.exists('evaluation')
    }

    query.select(
      'nid',
      'title',
      'author',
      'organization',
      'assignee',
      'category',
      'content',
      'status',
      'evaluation',
      'unreadCount',
      'replyCount',
      'latestReply'
    )
    if (sort.length) {
      sort.forEach(({ key, order }) => {
        if (order === 'asc') {
          query.addAscending(TICKET_SORT_KEY_MAP[key])
        } else {
          query.addDescending(TICKET_SORT_KEY_MAP[key])
        }
      })
    } else {
      query.ascending('createdAt')
    }
    query.limit(page_size)
    if (page > 1) {
      query.skip((page - 1) * page_size)
    }

    query.include('author', 'assignee')

    const [tickets, totalCount] = await Promise.all([
      page_size ? query.find({ user: req.user }) : [],
      count ? query.count({ user: req.user }) : 0,
    ])
    if (count) {
      res.append('X-Total-Count', totalCount)
      res.append('Access-Control-Expose-Headers', 'X-Total-Count')
    }

    let notificationMap = {}
    try {
      const notifications = await new AV.Query('notification')
        .containedIn('ticket', tickets)
        .equalTo('user', req.user)
        .find({ user: req.user })
      notificationMap = _.keyBy(notifications, (notification) => notification.get('ticket')?.id)
    } catch (error) {
      console.error(error)
    }

    res.json(
      tickets.map((ticket) => {
        const categoryId = ticket.get('category').objectId
        return {
          id: ticket.id,
          nid: ticket.get('nid'),
          title: ticket.get('title'),
          author_id: ticket.get('author').id,
          author: encodeUserObject(ticket.get('author')),
          organization_id: ticket.get('organization')?.id || '',
          assignee_id: ticket.get('assignee')?.id,
          assignee: ticket.get('assignee') ? encodeUserObject(ticket.get('assignee')) : null,
          category_id: categoryId,
          content: ticket.get('content'),
          // Removed in v1
          joined_customer_service_ids: [],
          status: ticket.get('status'),
          evaluation: ticket.get('evaluation') || null,
          unread_count: notificationMap[ticket.id]?.get('unreadCount') || 0,
          reply_count: ticket.get('replyCount') || 0,
          latest_reply: encodeLatestReply(ticket.get('latestReply')),
          created_at: ticket.createdAt,
          updated_at: ticket.updatedAt,
        }
      })
    )
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
      isCSInTicket(req.user, ticket.get('author')),
      getWatchObject(req.user, ticket),
    ])

    const keys = ['author', 'reporter', 'assignee', 'files', 'group', 'ACL']
    const include = ['author', 'reporter', 'assignee', 'files', 'group']
    if (isCS) {
      keys.push('privateTags')
    }
    await ticket.fetch({ keys, include, includeACL: true }, { user: req.user, useMasterKey: isCS })

    res.json({
      id: ticket.id,
      nid: ticket.get('nid'),
      title: ticket.get('title'),
      author_id: ticket.get('author').id,
      author: encodeUserObject(ticket.get('author')),
      reporter_id: ticket.get('reporter')?.id,
      reporter: ticket.get('reporter') ? encodeUserObject(ticket.get('reporter')) : null,
      organization_id: ticket.get('organization')?.id || '',
      assignee_id: ticket.get('assignee')?.id,
      assignee: ticket.get('assignee') ? encodeUserObject(ticket.get('assignee')) : null,
      group: encodeGroupObject(ticket.get('group')),
      category_id: ticket.get('category').objectId,
      content: ticket.get('content'),
      content_HTML: ticket.get('content_HTML'),
      file_ids: ticket.get('files')?.map((file) => file.id) || [],
      files: ticket.get('files')?.map(encodeFileObject) || [],
      evaluation: ticket.get('evaluation') || null,
      joined_customer_service_ids:
        ticket.get('joinedCustomerServices')?.map((user) => user.objectId) || [],
      status: ticket.get('status'),
      tags: ticket.get('tags') || [],
      private_tags: ticket.get('privateTags') || [],
      metadata: ticket.get('metaData') || {},
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,
      reply_count: ticket.get('replyCount') || 0,
      latest_reply: encodeLatestReply(ticket.get('latestReply')),
      subscribed: !!watch,
      private: ticket.getACL() ? !ticket.getACL().getRoleReadAccess('staff') : undefined,
    })

    resetUnreadCount(ticket, req.user)
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
    updated_at: reply.updatedAt,
  }
}

router.get(
  '/:id/replies',
  parseSearchingQ,
  query('created_at_gt').isISO8601().optional(),
  catchError(async (req, res) => {
    const { created_at_gt } = req.query
    const roles = await getRoles(req.user)
    const isUser = roles.length === 0

    let query = new AV.Query('Reply').equalTo('ticket', req.ticket)
    query.doesNotExist('deletedAt')
    if (created_at_gt) {
      query.greaterThan('createdAt', new Date(created_at_gt))
    }
    if (isUser) {
      const nonInternalQuery = AV.Query.or(
        new AV.Query('Reply').doesNotExist('internal'),
        new AV.Query('Reply').equalTo('internal', false)
      )
      query = AV.Query.and(query, nonInternalQuery)
    }

    const replies = await query
      .ascending('createdAt')
      .include('author', 'files')
      .limit(500)
      .find({ useMasterKey: true })

    res.json(
      replies.map((reply) => {
        return {
          ...encodeReplyObject(reply),
          author: encodeUserObject(reply.get('author')),
          files: reply.get('files')?.map(encodeFileObject) || [],
          internal: !isUser ? !!reply.get('internal') : undefined,
        }
      })
    )

    resetUnreadCount(req.ticket, req.user)
  })
)

router.post(
  '/:id/replies',
  check('content').isString(),
  check('file_ids').default([]).isArray(),
  check('file_ids.*').isString(),
  check('internal').isBoolean().optional(),
  catchError(async (req, res) => {
    const ticket = new Ticket(req.ticket)
    const author = req.user
    const { content, file_ids, internal } = req.body
    const isCustomerService = await isCSInTicket(req.user, ticket.author_id)

    if (internal && !isCustomerService) {
      res.throw(403)
    }

    const reply = await ticket.reply({
      author,
      content,
      file_ids,
      internal,
      isCustomerService,
    })

    res.json(encodeReplyObject(reply))
  })
)

router.delete(
  '/:id/replies/:replyId',
  customerServiceOnly,
  catchError(async (req, res) => {
    const { replyId } = req.params
    const reply = await new AV.Query('Reply').get(replyId, { useMasterKey: true })
    if (reply.get('author').id !== req.user.id) {
      throw new Error('This action must be done by the author')
    }
    reply.set('deletedAt', new Date())
    await reply.save(null, { useMasterKey: true })
    // 同时修改 active 和 acl 会导致 liveQuery 无法收到更新
    reply.setACL({})
    await reply.save(null, { useMasterKey: true })

    res.json({
      id: replyId,
    })
  })
)

router.get(
  '/:id/ops-logs',
  parseSearchingQ,
  query('created_at_gt').isISO8601().optional(),
  catchError(async (req, res) => {
    const { created_at_gt } = req.query
    const query = new AV.Query('OpsLog')
      .equalTo('ticket', req.ticket)
      .ascending('createdAt')
      .limit(500)
    if (created_at_gt) {
      query.greaterThan('createdAt', new Date(created_at_gt))
    }
    const opsLogs = await query.find({ user: req.user })
    res.json(
      opsLogs.map((opsLog) => {
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
        if (data.group) {
          log.group_id = data.group.objectId
        }
        if (data.changes) {
          log.changes = data.changes
        }
        return log
      })
    )
  })
)

router.patch(
  '/:id',
  check('group_id').isString().optional(),
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
  check('private').isBoolean().optional(),
  catchError(async (req, res) => {
    const {
      group_id,
      assignee_id,
      category_id,
      organization_id,
      tags,
      private_tags,
      evaluation,
      subscribed,
      private: isPrivate,
    } = req.body
    const isCS = await isCSInTicket(req.user, req.ticket.get('author').id)
    await req.ticket.fetch({ includeACL: true }, { useMasterKey: true })

    const ticket = new Ticket(req.ticket)

    if (group_id || group_id === '') {
      if (!isCS) {
        res.throw(403, 'Forbidden')
      }
      if (group_id !== '') {
        if (
          !(await isObjectExists('Group', group_id, {
            user: req.user,
          }))
        ) {
          res.throw(400, `Group(${group_id}) not exists`)
        }
      }
      ticket.group_id = group_id
    }

    if (assignee_id || assignee_id === '') {
      if (!isCS) {
        res.throw(403, 'Forbidden')
      }
      const vacationerIds = await getVacationerIds()
      if (vacationerIds.includes(assignee_id)) {
        res.throw(400, 'Sorry, this customer service is in vacation.')
      }
      if (assignee_id !== '') {
        if (!(await isObjectExists('_User', assignee_id))) {
          res.throw(400, `Assignee(${assignee_id}) not exists`)
        }
      }
      ticket.assignee_id = assignee_id
    }

    if (category_id) {
      if (!isCS) {
        res.throw(403, 'Forbidden')
      }
      ticket.category_id = category_id
    }

    if (organization_id !== undefined) {
      if (!(await isObjectExists('Organization', organization_id))) {
        res.throw(400, `Organization(${organization_id}) is not exists`)
      }
      ticket.organization_id = organization_id
    }

    if (tags) {
      if (!isCS) {
        res.throw(403, 'Forbidden')
      }
      ticket.tags = tags.map((tag) => ({ key: tag.key, value: tag.value }))
    }

    if (private_tags) {
      if (!isCS) {
        res.throw(403, 'Forbidden')
      }
      ticket.private_tags = private_tags.map((tag) => ({ key: tag.key, value: tag.value }))
    }

    if (evaluation) {
      if (req.user.id !== ticket.author_id) {
        res.throw(403, 'Only ticket author can submit evaluation')
      }
      if (!config.allowMutateEvaluation && ticket.evaluation) {
        res.throw(409, 'Evaluation already exists')
      }
      ticket.evaluation = { star: evaluation.star, content: evaluation.content }
    }

    if (subscribed !== undefined) {
      if (!isCS) {
        res.throw(403, 'Forbidden')
      }
      const watch = await getWatchObject(req.user, ticket.pointer)
      if (subscribed && !watch) {
        await new AV.Object('Watch', {
          ACL: { [req.user.id]: { read: true, write: true } },
          user: AV.Object.createWithoutData('_User', req.user.id),
          ticket: ticket.pointer,
        }).save()
      }
      if (!subscribed && watch) {
        await watch.destroy({ user: req.user })
      }
    }

    if (isPrivate !== undefined) {
      ticket.isPrivate = isPrivate
    }

    await ticket.save({ operator: req.user })

    res.json({})
  })
)

router.post(
  '/:id/operate',
  check('action')
    .isString()
    .custom((action) => Object.values(TICKET_ACTION).includes(action)),
  catchError(async (req, res) => {
    const ticket = new Ticket(req.ticket)

    ticket.operate(req.body.action, {
      isCustomerService: await isCSInTicket(req.user, ticket.author_id),
      operator: req.user,
    })
    await ticket.save({ operator: req.user })

    res.json({})
  })
)

router.get(
  '/:id/form-values',
  catchError(async (req, res) => {
    const formValues = await new AV.Query('TicketFieldValue').equalTo('ticket', req.ticket).first({
      useMasterKey: true,
    })
    res.json(formValues ? formValues.get('values') : {})
  })
)

router.patch(
  '/:id/form-values',
  check('form_values').isArray(),
  catchError(async (req, res) => {
    const { form_values } = req.body
    const obj = await new AV.Query('TicketFieldValue').equalTo('ticket', req.ticket).first({
      useMasterKey: true,
    })
    if (!obj) {
      res.throw(404, 'Not Found')
    }
    const differenceArray = getFormValuesDifference(form_values, obj.get('values'))
    /**
     * no change no save
     */
    if (differenceArray.length === 0) {
      res.json({
        updatedAt: obj.get('updatedAt'),
      })
      return
    }
    obj.set('values', form_values)
    const result = await obj.save(null, { useMasterKey: true })
    const ticket = new Ticket(req.ticket)
    ticket.pushOpsLog('changeFields', {
      changes: differenceArray,
      operator: makeTinyUserInfo(req.user),
    })
    await ticket.saveOpsLogs().catch(captureException)
    res.json({
      updatedAt: result.get('updatedAt'),
    })
  })
)

module.exports = router
