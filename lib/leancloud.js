/*global LEANCLOUD_APP_ID, LEANCLOUD_APP_KEY, LEANCLOUD_API_HOST, LEANCLOUD_APP_ENV, LEAN_CLI_HAVE_STAGING */

import * as LC from 'open-leancloud-storage'
import * as adapters from '@leancloud/platform-adapters-browser'

LC.setAdapters(adapters)

export const app = LC.init({
  appId: LEANCLOUD_APP_ID,
  appKey: LEANCLOUD_APP_KEY,
  serverURL: LEANCLOUD_API_HOST,
})

if (LEANCLOUD_APP_ENV === 'development') {
  app.production = LEAN_CLI_HAVE_STAGING !== 'true'
} else {
  app.production = LEANCLOUD_APP_ENV === 'production'
}

export const db = app.database()
export const auth = app.auth()
export const cloud = app.cloud()
export const storage = app.storage()
export default LC

function compatibleObject(constructor) {
  constructor.prototype.set = function(key, value) {
    this.data[key] = value
  }

  const { get } = constructor.prototype
  constructor.prototype.get = function(options) {
    if (typeof options === 'string') {
      return this.data[options]
    }
    return get.call(this, options)
  }

  constructor.prototype.has = function(key) {
    return typeof this.data[key] !== 'undefined'
  }
}

LC.use({
  onLoad: ({modules}) => {
    compatibleObject(modules.core.components.LCObject)
    compatibleObject(modules.auth.components.User)
    compatibleObject(modules.auth.components.Role)
  }
})
