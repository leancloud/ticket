class Context {
  /**
   * @param {object} data
   * @param {'create' | 'update'} [updateType]
   * @param {Array<string>} [updatedKeys]
   */
  constructor(data, updateType, updatedKeys) {
    this.data = { ...data }
    this.updateType = updateType
    this._updatedKeys = new Set(updatedKeys)
    this._updatedKeysInCtx = new Set()
  }

  keyIsUpdated(key) {
    return this._updatedKeysInCtx.has(key) || this._updatedKeys.has(key)
  }

  /**
   * @returns {number}
   */
  getStatus() {
    return this.data.status
  }

  /**
   * @param {number} value
   */
  setStatus(value) {
    this.data.status = value
    this._updatedKeysInCtx.add('status')
  }

  /**
   * @returns {string}
   */
  getAssigneeId() {
    return this.data.assignee?.objectId
  }

  /**
   * @param {string} value
   */
  setAssigneeId(value) {
    this.data.assignee = {
      __type: 'Pointer',
      className: '_User',
      objectId: value,
    }
    this._updatedKeysInCtx.add('assignee')
  }

  /**
   * @returns {string}
   */
  getTitle() {
    return this.data.title
  }

  /**
   * @returns {string}
   */
  getContent() {
    return this.data.content
  }

  /**
   * @returns {Date}
   */
  getCreatedAt() {
    return this.data.createdAt
  }

  /**
   * @returns {Date}
   */
  getUpdatedAt() {
    return this.data.updatedAt
  }

  isUpdated() {
    return this._updatedKeysInCtx.size > 0
  }

  /**
   * @returns {object}
   */
  getUpdatedData() {
    const data = {}
    this._updatedKeysInCtx.forEach((key) => {
      data[key] = this.data[key]
    })
    return data
  }
}

module.exports = { Context }
