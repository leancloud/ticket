/*global LEANCLOUD_APP_ENV, LEAN_CLI_HAVE_STAGING */

import * as LC from 'open-leancloud-storage'
import { createResourceHook } from '@leancloud/use-resource'
import axios from 'axios'
import _ from 'lodash'

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
 * @typedef {Record<string, string | number | boolean} QueryParams
 */

/**
 * @deprecated
 * @param {string} input
 * @param {RequestInit & { query?: QueryParams }} [init]
 * @returns {Promise}
 */
export async function fetch(input, init) {
  if (init?.query) {
    const query = Object.entries(init.query).filter(([, value]) => value !== undefined)
    if (Object.keys(query).length) {
      input += '?' + query.map(([key, value]) => key + '=' + encodeURIComponent(value)).join('&')
    }
  }
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

export const useObjects = createResourceHook((className, queryModifier) => {
  const clazz = db.class(className)
  const query = queryModifier ? queryModifier(clazz, db.cmd) : clazz
  const abortController = new AbortController()
  return {
    abort: () => abortController.abort(),
    promise: query.find({ abortSignal: abortController.signal }),
  }
})
export const useObject = createResourceHook((className, objectId) => {
  const abortController = new AbortController()
  return {
    abort: () => abortController.abort(),
    promise: db.class(className).object(objectId).get({ abortSignal: abortController.signal }),
  }
})

export const useFunction = createResourceHook((functionName, params) => {
  return cloud.run(functionName, params)
})

const getHttpInstance = (transformResponse = (res) => res.data) => {
  const instance = axios.create()
  instance.interceptors.request.use(function (config) {
    if (auth.currentUser) {
      config.headers['x-lc-session'] = auth.currentUser.sessionToken
    }
    return config
  })
  instance.interceptors.response.use(transformResponse, function (err) {
    if (err.response && err.response.data) {
      throw new Error(err.response.data.message || err.response.data)
    }
    throw err
  })
  return instance
}
const http = getHttpInstance()
const transformResponseWithCount = (res) => {
  if (res.headers['x-total-count'] !== undefined) {
    const count = _.toNumber(res.headers['x-total-count'])
    return [res.data, _.isNaN(count) ? 0 : count]
  }
  console.warn('response header not include "x-total-count",use http instead')
  return res.data
}
const httpWithLimitation = getHttpInstance(transformResponseWithCount)
export { http, httpWithLimitation }
