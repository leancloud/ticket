class CacheItem {
  /**
   * @param {any} value
   * @param {number} expiredAt
   */
  constructor(value, expiredAt) {
    this.value = value
    this.expiredAt = expiredAt
  }

  get expired() {
    return Date.now() > this.expiredAt
  }
}

class Cache {
  /**
   * @param {number} gcInterval
   */
  constructor(gcInterval = 1000 * 10) {
    /**
     * @type {Record<string, CacheItem>}
     */
    this._data = {}
    this._gcTimer = setInterval(() => this.gc(), gcInterval)
  }

  gc() {
    Object.entries(this._data).forEach(([key, item]) => {
      if (item.expired) {
        delete this._data[key]
      }
    })
  }

  async get(key, getter, lifetime = 1000 * 60 * 5) {
    key = id(key)
    const item = this._data[key]
    if (!item || item.expired) {
      const value = await getter()
      this._data[key] = new CacheItem(value, Date.now() + lifetime)
      return value
    }
    return item.value
  }
}

function id(value) {
  switch (typeof value) {
    case 'number':
    case 'string':
    case 'symbol':
      return value

    case 'object':
      if (Array.isArray(value)) {
        return JSON.stringify(value.map(id))
      }
      return JSON.stringify(
        Object.keys(value)
          .sort()
          .reduce((obj, key) => {
            obj[key] = id(value[key])
            return obj
          }, {})
      )

    default:
      throw new TypeError('Unsupported value type: ' + typeof value)
  }
}

module.exports = new Cache()
