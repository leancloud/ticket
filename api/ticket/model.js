const AV = require('leancloud-storage')

const { ticketStatus, TICKET_STATUS } = require('../../lib/common')
const { getTinyCategoryInfo } = require('../category/utils')
const { htmlify } = require('../common')
const { saveWithoutHooks } = require('../utils/object')
const notification = require('../notification')
const { systemUser, makeTinyUserInfo } = require('../user/utils')
const { captureException } = require('../errorHandler')
const { invokeWebhooks } = require('../webhook')
const { selectAssignee } = require('./utils')

const KEY_MAP = {
  assignee_id: 'assignee',
  category_id: 'category',
  organization_id: 'organization',
  tags: 'tags',
  private_tags: 'privateTags',
  evaluation: 'evaluation',
  status: 'status',
}

class Ticket {
  /**
   * @param {AV.Object} object
   */
  constructor(object) {
    this.object = object
    this.pointer = AV.Object.createWithoutData('Ticket', object.id)

    this._authorInfo = undefined
    if (object.get('author').has('username')) {
      this._authorInfo = makeTinyUserInfo(object.get('author'))
    }

    this._assigneeInfo = undefined
    if (object.get('assignee').has('username')) {
      this._assigneeInfo = makeTinyUserInfo(object.get('assignee'))
    }

    /**
     * @private
     * @type {Set<string>}
     */
    this._updatedKeys = new Set()

    /**
     * @private
     * @type {AV.Object[]}
     */
    this._unsavedOpsLogs = []
  }

  /**
   * @param {object} data
   * @param {string} data.title
   * @param {string} data.category_id
   * @param {AV.User} data.author
   * @param {AV.User} [data.assignee]
   * @param {string} data.content
   * @param {string[]} [data.file_ids]
   * @param {Record<string, any>} [data.metadata]
   * @param {string} [data.organization_id]
   */
  static async create(data) {
    const assignee = data.assignee || (await selectAssignee(data.category_id))

    const obj = new AV.Object('Ticket')
    obj.set('status', TICKET_STATUS.NEW)
    obj.set('title', data.title)
    obj.set('category', await getTinyCategoryInfo(data.category_id))
    obj.set('author', AV.Object.createWithoutData('_User', data.author.id))
    obj.set('assignee', AV.Object.createWithoutData('_User', assignee.id))
    obj.set('content', data.content)
    obj.set('content_HTML', htmlify(data.content))
    if (data.file_ids?.length) {
      const filePointers = data.file_ids.map((id) => AV.Object.createWithoutData('_File', id))
      obj.set('files', filePointers)
    }
    if (data.metadata) {
      obj.set('metaData', data.metadata)
    }

    const ACL = new AV.ACL({
      [data.author.id]: { read: true, write: true },
      'role:customerService': { read: true, write: true },
    })
    if (data.organization_id) {
      ACL.setRoleReadAccess(data.organization_id + '_member', true)
      ACL.setRoleWriteAccess(data.organization_id + '_member', true)
      obj.set('organization', AV.Object.createWithoutData('Organization', data.organization_id))
    }
    obj.setACL(ACL)

    await saveWithoutHooks(obj, {
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
      user: data.author,
    })

    const ticket = new Ticket(obj)

    ticket.pushOpsLog('selectAssignee', { assignee: makeTinyUserInfo(assignee) })
    ticket.saveOpsLogs()

    notification.newTicket(obj, data.author, assignee).catch(captureException)

    invokeWebhooks('ticket.create', { ticket: obj.toJSON() })

    return ticket
  }

  get id() {
    return this.object.id
  }

  /**
   * @type {number}
   */
  get nid() {
    return this.object.get('nid')
  }

  /**
   * @type {string}
   */
  get author_id() {
    return this.object.get('author').id
  }

  /**
   * @type {string}
   */
  get assignee_id() {
    return this.object.get('assignee').id
  }
  set assignee_id(v) {
    this.object.set('assignee', AV.Object.createWithoutData('_User', v))
    this._updatedKeys.add('assignee_id')
    this._assigneeInfo = undefined
  }

  /**
   * @type {string}
   */
  get category_id() {
    return this.object.get('category').objectId
  }
  set category_id(v) {
    this.object.set('category', { objectId: v })
    this._updatedKeys.add('category_id')
  }

  /**
   * @type {string}
   */
  get organization_id() {
    return this.object.get('organization')?.id
  }
  set organization_id(v) {
    this.object.set('organization', AV.Object.createWithoutData('Organization', v))
    this.object.setACL(this.getACL())
    this._updatedKeys.add('organization_id')
  }

  get tags() {
    return this.object.get('tags') || []
  }
  set tags(v) {
    this.object.set('tags', v)
    this._updatedKeys.add('tags')
  }

  get private_tags() {
    return this.object.get('privateTags') || []
  }
  set private_tags(v) {
    this.object.set('privateTags', v)
    this._updatedKeys.add('private_tags')
  }

  get evaluation() {
    return this.object.get('evaluation')
  }
  set evaluation(v) {
    this.object.set('evaluation', v)
    this._updatedKeys.add('evaluation')
  }

  /**
   * @type {number}
   */
  get status() {
    return this.object.get('status')
  }
  set status(v) {
    this.object.set('status', v)
    this._updatedKeys.add('status')
  }

  get unread_count() {
    return this.object.get('unreadCount') ?? 0
  }
  set unread_count(v) {
    this.object.set('unreadCount', v)
  }

  getACL() {
    const rawACL = {
      [this.author_id]: { read: true, write: true },
      'role:customerService': { read: true, write: true },
    }
    if (this.organization_id) {
      rawACL[this.organization_id + '_member'] = { read: true, write: true }
    }
    return new AV.ACL(rawACL)
  }

  /**
   * @param {string} [key]
   */
  isUpdated(key) {
    if (key) {
      return this._updatedKeys.has(key)
    }
    return this._updatedKeys.size > 0
  }

  async getAuthorInfo() {
    if (!this._authorInfo) {
      const author = this.object.get('author')
      if (!author.has('username')) {
        await author.fetch(
          {
            keys: ['username', 'name', 'email'],
          },
          {
            useMasterKey: true,
          }
        )
      }
      this._authorInfo = makeTinyUserInfo(author)
    }
    return this._authorInfo
  }

  async getAssigneeInfo() {
    if (!this._assigneeInfo) {
      const assignee = this.object.get('assignee')
      if (!assignee.has('username')) {
        await assignee.fetch(
          {
            keys: ['username', 'name', 'email'],
          },
          {
            useMasterKey: true,
          }
        )
      }
      this._assigneeInfo = makeTinyUserInfo(assignee)
    }
    return this._assigneeInfo
  }

  pushOpsLog(action, data) {
    this._unsavedOpsLogs.push(new AV.Object('OpsLog', { ticket: this.pointer, action, data }))
  }

  saveOpsLogs() {
    if (this._unsavedOpsLogs.length === 0) {
      return
    }
    const opsLogs = this._unsavedOpsLogs
    this._unsavedOpsLogs = []
    if (opsLogs.length === 1) {
      opsLogs[0].save(null, { useMasterKey: true }).catch(captureException)
    } else {
      AV.Object.saveAll(opsLogs, { useMasterKey: true }).catch(captureException)
    }
  }

  /**
   * @param {object} [options]
   * @param {AV.User} [options.operator]
   */
  async save(options) {
    if (!this.object.dirty()) {
      return
    }

    const operator = options?.operator || systemUser
    const operatorInfo = makeTinyUserInfo(operator)

    if (this.isUpdated('category_id')) {
      this.object.set('category', await getTinyCategoryInfo(this.category_id))
    }

    await saveWithoutHooks(this.object, {
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
      useMasterKey: operator === systemUser,
      user: operator === systemUser ? undefined : operator,
    })

    if (this.isUpdated('category_id')) {
      this.pushOpsLog('changeCategory', {
        category: this.object.get('category'),
        operator: operatorInfo,
      })
    }

    if (this.isUpdated('assignee_id')) {
      this.pushOpsLog('changeAssignee', {
        assignee: await this.getAssigneeInfo(),
        operator: operatorInfo,
      })
      notification
        .changeAssignee(this.object, operator, this.object.get('assignee'))
        .catch(captureException)
    }

    if (this.isUpdated('evaluation')) {
      this.getAssigneeInfo()
        .then(() => notification.ticketEvaluation(this.object, operator, this.get('assignee')))
        .catch(captureException)
    }

    if (this.isUpdated('status') && ticketStatus.isClosed(this.status)) {
      AV.Cloud.run('statsTicket', { ticketId: this.id })
    }

    invokeWebhooks('ticket.update', {
      ticket: this.object.toJSON(),
      updatedKeys: Array.from(this._updatedKeys).map((key) => KEY_MAP[key] || key),
    })

    this.saveOpsLogs()
    this._updatedKeys.clear()
  }

  /**
   * @param {object} data
   * @param {AV.User} data.author
   * @param {string} data.content
   * @param {string[]} [data.file_ids]
   * @param {boolean} [data.isCustomerService]
   */
  async reply(data) {
    const reply = new AV.Object('Reply', {
      ticket: this.pointer,
      author: data.author,
      content: data.content,
      content_HTML: htmlify(data.content),
      isCustomerService: !!data.isCustomerService,
    })

    if (data.file_ids?.length) {
      const filePointers = data.file_ids.map((id) => AV.Object.createWithoutData('_File', id))
      reply.set('files', filePointers)
    }

    const ACL = new AV.ACL({
      [data.author.id]: { read: true, write: true },
      [this.author_id]: { read: true },
      'role:customerService': { read: true },
    })
    if (this.organization) {
      ACL.setRoleReadAccess(this.organization.id + '_member', true)
    }
    reply.setACL(ACL)

    await saveWithoutHooks(reply, {
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
      user: data.author,
    })

    const replyAuthorInfo = makeTinyUserInfo(data.author)

    this.object.set('latestReply', {
      objectId: reply.id,
      author: replyAuthorInfo,
      content: data.content,
      isCustomerService: !!data.isCustomerService,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
    })

    this.object.increment('replyCount', 1)

    if (data.isCustomerService) {
      this.object.addUnique('joinedCustomerServices', replyAuthorInfo)
      this.object.increment('unreadCount')
      this.status = TICKET_STATUS.WAITING_CUSTOMER
    } else {
      this.status = TICKET_STATUS.WAITING_CUSTOMER_SERVICE
    }

    this.save().catch(captureException)

    // notification 需要 assignee 的信息
    this.getAssigneeInfo()
      .then(() => notification.replyTicket(this.object, reply, data.author))
      .catch(captureException)

    return reply
  }
}

module.exports = Ticket
