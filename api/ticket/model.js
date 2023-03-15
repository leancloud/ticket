const AV = require('leancloud-storage')

const { ticketStatus, TICKET_STATUS } = require('../../lib/common')
const { getTinyCategoryInfo } = require('../category/utils')
const { htmlify } = require('../common')
const { saveWithoutHooks } = require('../utils/object')
const { getTinyGroupInfo } = require('../group/utils')
const { systemUser, makeTinyUserInfo, getTinyUserInfo } = require('../user/utils')
const { captureException } = require('../errorHandler')
const { selectAssignee, getActionStatus, selectGroup } = require('./utils')

const ATTRIBUTES = ['nid', 'title', 'category', 'author', 'content', 'status']

class Ticket {
  /**
   * @param {AV.Object} object
   */
  constructor(object) {
    if (!object.id) {
      throw new Error('Cannot construct Ticket by an unsaved AVObject')
    }
    for (const attr of ATTRIBUTES) {
      if (!object.has(attr)) {
        throw new Error(`The ${attr} is missing in the AVObject`)
      }
    }

    /**
     * @readonly
     */
    this.pointer = { __type: 'Pointer', className: 'Ticket', objectId: object.id }

    /**
     * @readonly
     */
    this.id = object.id

    /**
     * @readonly
     * @type {number}
     */
    this.nid = object.get('nid')

    /**
     * @readonly
     * @type {object}
     */
    this.metaData = object.get('metaData')

    /**
     * @readonly
     */
    this.created_at = object.createdAt

    /**
     * @readonly
     */
    this.updated_at = object.updatedAt

    /**
     * @private
     * @type {string}
     */
    this._title = object.get('title')

    /**
     * @private
     * @type {string}
     */
    this._content = object.get('content')

    /**
     * @private
     * @type {{ objectId: string; name: string; }}
     */
    this._category = object.get('category')

    /**
     * @private
     * @type {string}
     */
    this._organizationId = object.get('organization')?.id || ''

    /**
     * @private
     * @type {string}
     */
    this._authorId = object.get('author').id
    if (object.get('author').has('username')) {
      /**
       * @private
       */
      this._authorInfo = makeTinyUserInfo(object.get('author'))
    }

    /**
     * @private
     * @type {string}
     */
    this._groupId = object.get('group')?.id
    /**
     * @private
     * @type {string}
     */

    this._assigneeId = object.get('assignee')?.id
    if (object.get('assignee')?.has('username')) {
      /**
       * @private
       */
      this._assigneeInfo = makeTinyUserInfo(object.get('assignee'))
    }

    /**
     * @private
     * @type { {key: string; value: any; }[]}
     */
    this._tags = object.get('tags') || []

    /**
     * @private
     * @type { {key: string; value: any; }[]}
     */
    this._privateTags = object.get('privateTags') || []

    /**
     * @private
     * @type {{ star: 0 | 1; content: string; }}
     */
    this._evaluation = object.get('evaluation')

    /**
     * @private
     * @type {number}
     */
    this._status = object.get('status')

    /**
     * @private
     * @type {Record<string, any>}
     */
    this._latestReply = object.get('latestReply')

    /**
     * @private
     * @type {Set<string>}
     */
    this._updatedKeys = new Set()

    /**
     * @private
     * @type {Record<string, any>[]}
     */
    this._unsavedOpsLogs = []

    /**
     * @private
     */
    this._replyCountIncrement = 0

    /**
     * @private
     */
    this._unreadCountIncrement = 0

    /**
     * @private
     */
    this._customerServicesToJoin = undefined

    /**
     * @private
     */
    this._operatorId = undefined

    /**
     * @private
     */
    this._private = object.getACL() ? !object.getACL().getRoleReadAccess('staff') : undefined
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
    const group = await selectGroup(data.category_id)

    const obj = new AV.Object('Ticket')
    obj.set('status', TICKET_STATUS.NEW)
    obj.set('title', data.title)
    obj.set('category', await getTinyCategoryInfo(data.category_id))
    obj.set('author', AV.Object.createWithoutData('_User', data.author.id))
    if (assignee) {
      obj.set('assignee', AV.Object.createWithoutData('_User', assignee.id))
    }
    if (group) {
      obj.set('group', AV.Object.createWithoutData('Group', group.id))
    }
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
      'role:staff': { read: true },
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
      fetchWhenSave: true,
    })

    const ticket = new Ticket(obj)

    if (assignee) {
      ticket.pushOpsLog('selectAssignee', { assignee: makeTinyUserInfo(assignee) })
    }
    if (group) {
      ticket.pushOpsLog(
        'changeGroup',
        {
          group: await getTinyGroupInfo(group.id),
          operator: systemUser,
        },
        true
      )
    }
    ticket.saveOpsLogs().catch(captureException)

    return ticket
  }

  get author_id() {
    return this._authorId
  }

  get group_id() {
    return this._groupId
  }
  set group_id(v) {
    this._groupId = v
    this._updatedKeys.add('group_id')
  }

  get assignee_id() {
    return this._assigneeId || ''
  }
  set assignee_id(v) {
    if (v === 'system') {
      return
    }
    this._assigneeId = v
    this._assigneeInfo = undefined
    this._updatedKeys.add('assignee_id')
  }

  get category_id() {
    return this._category.objectId
  }
  set category_id(v) {
    this._category = { objectId: v }
    this._updatedKeys.add('category_id')
  }

  get organization_id() {
    return this._organizationId
  }
  set organization_id(v) {
    this._organizationId = v
    this._updatedKeys.add('organization_id')
  }

  get title() {
    return this._title
  }

  get content() {
    return this._content
  }

  get tags() {
    return this._tags
  }
  set tags(v) {
    this._tags = v
    this._updatedKeys.add('tags')
  }

  get private_tags() {
    return this._privateTags
  }
  set private_tags(v) {
    this._privateTags = v
    this._updatedKeys.add('private_tags')
  }

  get evaluation() {
    return this._evaluation
  }
  set evaluation(v) {
    this._evaluation = v
    this._updatedKeys.add('evaluation')
  }

  get status() {
    return this._status
  }
  set status(v) {
    this._status = v
    this._updatedKeys.add('status')
  }

  get isPrivate() {
    return this._private
  }
  set isPrivate(v) {
    this._private = v
    this._updatedKeys.add('private')
  }

  get latest_reply() {
    return this._latestReply
  }
  set latest_reply(v) {
    this._latestReply = v
    this._updatedKeys.add('latest_reply')
  }

  getACL() {
    const rawACL = {
      [this.author_id]: { read: true, write: true },
      'role:customerService': { read: true, write: true },
    }
    if (this.organization_id) {
      rawACL[this.organization_id + '_member'] = { read: true, write: true }
    }
    if (!this.isPrivate) {
      rawACL['role:staff'] = { read: true }
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
    return (
      this._updatedKeys.size > 0 ||
      this._replyCountIncrement > 0 ||
      this._customerServicesToJoin !== undefined
    )
  }

  async getAuthorInfo() {
    if (!this._authorInfo) {
      this._authorInfo = await getTinyUserInfo(this.author_id)
    }
    return this._authorInfo
  }

  async getAssigneeInfo() {
    if (!this.assignee_id) {
      return null
    }
    if (!this._assigneeInfo) {
      this._assigneeInfo = await getTinyUserInfo(this.assignee_id)
    }
    return this._assigneeInfo
  }

  pushOpsLog(action, data, internal) {
    this._unsavedOpsLogs.push({ ticket: this.pointer, action, data, internal })
  }

  async saveOpsLogs() {
    if (this._unsavedOpsLogs.length === 0) {
      return
    }
    const opsLogs = this._unsavedOpsLogs.map((data) => new AV.Object('OpsLog', data))
    this._unsavedOpsLogs = []
    if (opsLogs.length === 1) {
      await opsLogs[0].save(null, { useMasterKey: true })
    } else {
      await AV.Object.saveAll(opsLogs, { useMasterKey: true })
    }
  }

  increaseReplyCount(amount = 1) {
    this._replyCountIncrement += amount
  }

  increaseUnreadCount(amount = 1) {
    this._unreadCountIncrement += amount
  }

  joinCustomerService(user) {
    if (this._customerServicesToJoin) {
      throw new Error('Has unsaved joined customer service')
    }
    this._customerServicesToJoin = user
  }

  /**
   * @private
   */
  _getDirtyAVObject() {
    const object = AV.Object.createWithoutData('Ticket', this.id)

    if (this.isUpdated('category_id')) {
      if (!this._category.name) {
        throw new Error('The name of category is missing')
      }
      object.set('category', this._category)
    }

    if (this.isUpdated('group_id')) {
      if (this.group_id === '') {
        object.unset('group')
      } else {
        object.set('group', AV.Object.createWithoutData('Group', this.group_id))
      }
    }

    if (this.isUpdated('assignee_id')) {
      if (this.assignee_id === '') {
        object.unset('assignee')
      } else {
        object.set('assignee', AV.Object.createWithoutData('_User', this.assignee_id))
      }
    }

    if (this.isUpdated('organization_id')) {
      if (this.organization_id === '') {
        object.unset('organization')
      } else {
        object.set(
          'organization',
          AV.Object.createWithoutData('Organization', this.organization_id)
        )
      }
      object.setACL(Ticket.getACL())
    }

    if (this.isUpdated('tags')) {
      object.set('tags', this.tags)
    }

    if (this.isUpdated('private_tags')) {
      object.set('privateTags', this.private_tags)
    }

    if (this.isUpdated('evaluation')) {
      object.set('evaluation', this.evaluation)
    }

    if (this.isUpdated('status')) {
      object.set('status', this.status)
    }

    if (this.isUpdated('private')) {
      object.setACL(this.getACL())
    }

    if (this.isUpdated('latest_reply')) {
      object.set('latestReply', this.latest_reply)
    }

    if (this._replyCountIncrement) {
      object.increment('replyCount', this._replyCountIncrement)
    }

    if (this._unreadCountIncrement) {
      object.increment('unreadCount', this._unreadCountIncrement)
    }

    if (this._customerServicesToJoin) {
      object.addUnique('joinedCustomerServices', this._customerServicesToJoin)
    }

    return object
  }

  /**
   * @param {object} [options]
   * @param {AV.User} [options.operator]
   * @param {boolean} [options.skipTriggers]
   */
  async save(options) {
    if (!this.isUpdated()) {
      return
    }

    const operator = options?.operator || systemUser
    if (this._operatorId && this._operatorId !== operator.id) {
      throw new Error('Operator must be ' + this._operatorId)
    }

    if (this.isUpdated('category_id')) {
      this._category = await getTinyCategoryInfo(this.category_id)
    }

    const object = this._getDirtyAVObject()
    const operatorInfo = makeTinyUserInfo(operator)
    const useMasterKey = operator.id === 'system'

    await saveWithoutHooks(object, {
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
      useMasterKey,
      user: useMasterKey ? undefined : operator,
    })

    if (this.isUpdated('category_id')) {
      this.pushOpsLog('changeCategory', {
        category: this._category,
        operator: operatorInfo,
      })
    }
    if (this.isUpdated('group_id')) {
      this.pushOpsLog(
        'changeGroup',
        { group: await getTinyGroupInfo(this.group_id), operator: operatorInfo },
        true
      )
    }

    if (this.isUpdated('assignee_id')) {
      const assigneeInfo = await this.getAssigneeInfo()
      this.pushOpsLog('changeAssignee', {
        assignee: assigneeInfo,
        operator: operatorInfo,
      })
    }

    if (this.isUpdated('status') && ticketStatus.isClosed(this.status)) {
      AV.Cloud.run('statsTicket', { ticketId: this.id })
    }

    this.saveOpsLogs().catch(captureException)

    this._replyCountIncrement = 0
    this._customerServicesToJoin = undefined
    this._operatorId = undefined

    this._updatedKeys.clear()
  }

  /**
   * @param {object} data
   * @param {AV.User} data.author
   * @param {string} data.content
   * @param {string[]} [data.file_ids]
   * @param {boolean} [data.isCustomerService]
   * @param {boolean} [data.internal]
   */
  async reply(data) {
    const reply = new AV.Object('Reply', {
      ticket: this.pointer,
      author: data.author,
      content: data.content,
      content_HTML: htmlify(data.content),
      isCustomerService: !!data.isCustomerService,
      internal: !!data.internal,
    })

    if (data.file_ids?.length) {
      const filePointers = data.file_ids.map((id) => AV.Object.createWithoutData('_File', id))
      reply.set('files', filePointers)
    }

    const ACL = new AV.ACL({
      [data.author.id]: { read: true, write: true },
      'role:customerService': { read: true },
      'role:staff': { read: true },
    })
    if (!data.internal) {
      ACL.setReadAccess(this.author_id, true)
      if (this.organization) {
        ACL.setRoleReadAccess(this.organization.id + '_member', true)
      }
    }
    reply.setACL(ACL)

    await saveWithoutHooks(reply, {
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
      user: data.author,
    })

    if (!data.internal) {
      const replyAuthorInfo = makeTinyUserInfo(data.author)

      this.latest_reply = {
        objectId: reply.id,
        author: replyAuthorInfo,
        content: data.content,
        isCustomerService: !!data.isCustomerService,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
      }

      this.increaseReplyCount(1)

      if (data.isCustomerService) {
        this.joinCustomerService(replyAuthorInfo)
        // XXX: 适配加速器的使用场景
        this.increaseUnreadCount(1)
      }
      if (this.status < TICKET_STATUS.FULFILLED) {
        this.status = data.isCustomerService
          ? TICKET_STATUS.WAITING_CUSTOMER
          : TICKET_STATUS.WAITING_CUSTOMER_SERVICE
      }

      this.save({ operator: data.author }).catch(captureException)
    }

    return reply
  }

  async saveFormValues(values) {
    const obj = new AV.Object('TicketFieldValue')
    const result = await obj.save(
      {
        ACL: {},
        ticket: AV.Object.createWithoutData('Ticket', this.id),
        values,
      },
      {
        useMasterKey: true,
      }
    )
    return { id: result.id }
  }

  /**
   * @param {string} action
   * @param {object} [options]
   * @param {AV.User} [options.operator]
   * @param {boolean} [options.isCustomerService]
   */
  operate(action, options) {
    const operator = options?.operator || systemUser
    const operatorInfo = makeTinyUserInfo(operator)
    const isCustomerService = operator.id === 'system' || !!options?.isCustomerService
    const status = getActionStatus(action, isCustomerService)

    if (isCustomerService) {
      if (operator.id !== 'system') {
        this.joinCustomerService(operatorInfo)
      }
      if (ticketStatus.isOpened(status) !== ticketStatus.isOpened(this.status)) {
        // XXX: 适配加速器的使用场景
        this.increaseUnreadCount(1)
      }
    }

    this.status = status
    this.pushOpsLog(action, { operator: operatorInfo })
    this._operatorId = operator.id
  }
}

module.exports = Ticket
