/*global LEANCLOUD_APP_ENV, LEAN_CLI_HAVE_STAGING */

import * as LC from 'open-leancloud-storage'

export const app = LC.init({
  appId: window.LEANCLOUD_APP_ID,
  appKey: window.LEANCLOUD_APP_KEY,
  serverURL: window.LEANCLOUD_API_HOST,
})

if (LEANCLOUD_APP_ENV === 'development') {
  app.config.production = LEAN_CLI_HAVE_STAGING !== 'true'
  window.app = app
} else {
  app.config.production = LEANCLOUD_APP_ENV === 'production'
}

export const db = app.database()
export const auth = app.auth()
export const cloud = app.cloud()
export const storage = app.storage()
export default LC

function compatibleObject(constructor) {
  constructor.prototype.set = function (key, value) {
    this.data[key] = value
  }

  const { get } = constructor.prototype
  constructor.prototype.get = function (options) {
    if (typeof options === 'string') {
      return this.data[options]
    }
    return get.call(this, options)
  }

  constructor.prototype.has = function (key) {
    return typeof this.data[key] !== 'undefined'
  }
}

LC.use({
  name: 'compatibleObject',
  onLoad: ({ modules }) => {
    compatibleObject(modules.core.components.LCObject)
    compatibleObject(modules.auth.components.User)
    compatibleObject(modules.auth.components.Role)
  },
})

/**
 *
 * @param {RequestInfo} input
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
export async function fetch(input, init) {
  const res = await window.fetch(input, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-lc-session': auth.currentUser?.sessionToken,
      ...init?.headers,
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  if (res.status >= 400) {
    throw new Error((await res.json()).message)
  }
  return res.json()
}
