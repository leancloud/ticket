const AV = require('leanengine')
const { Router } = require('express')
const { check } = require('express-validator')

const { checkPermission } = require('../oauth')
const { requireAuth, catchError } = require('../middleware')
const { selectAssignee, getTinyCategoryInfo, saveWithoutHooks } = require('./utils')
const { htmlify } = require('../common')
const { TICKET_STATUS, getTicketAcl } = require('../../lib/common')
const { afterSaveTicketHandler } = require('./hook-handler')

const router = Router().use(requireAuth)

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
    ticket.set(
      'files',
      file_ids.map((id) => ({
        __type: 'Pointer',
        className: '_File',
        objectId: id,
      }))
    )
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

module.exports = router
