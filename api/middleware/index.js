const AV = require('leancloud-storage')
const { validationResult } = require('express-validator')

const { isCustomerService } = require('../common')
const { parse } = require('../utils/search')

exports.requireAuth = async (req, res, next) => {
  const sessionToken = req.get('X-LC-Session')
  if (!sessionToken) {
    return res.sendStatus(401)
  }
  try {
    req.user = await AV.User.become(sessionToken)
    next()
  } catch (error) {
    if (error.code === 211) {
      return res.sendStatus(403)
    }
    next(error)
  }
}

exports.customerServiceOnly = async (req, res, next) => {
  if (!req.user) {
    return res.sendStatus(401)
  }
  try {
    if (await isCustomerService(req.user)) {
      next()
    } else {
      res.sendStatus(403)
    }
  } catch (error) {
    next(error)
  }
}

function throwError(status = 500, message = 'Internal Error') {
  const error = new Error(message)
  error.status = status
  throw error
}

const errorFormatter = ({ location, msg, param }) => `${location}[${param}]: ${msg}`

/**
 * @typedef {import('express').Response & { throw: (status?: number, message?: string) => void }} Response
 */

/**
 * @param {(req: import('express').Request, res: Response) => void | Promise<void>} handler
 */
exports.catchError = (handler) => {
  return async (req, res, next, ...args) => {
    res.throw = throwError
    try {
      const result = validationResult(req).formatWith(errorFormatter)
      if (!result.isEmpty()) {
        const error = new Error(result.array()[0])
        error.status = 400
        throw error
      }
      await handler(req, res, next, ...args)
    } catch (error) {
      switch (error.code) {
        case 101:
          error.status = 404
          break
        case 403:
          error.status = 403
          break
      }
      next(error)
    }
  }
}

exports.parseSearching = (schema) =>
  exports.catchError((req, res, next) => {
    const q = parse(req.query.q)
    const params = {}
    Object.entries(schema).forEach(([key, validators]) => {
      Object.entries(validators).forEach(([type, validator]) => {
        const value = q[type]?.[key]
        if (value === undefined) {
          return
        }
        if (validator && !validator(value)) {
          res.throw(400, `Invalid query.q.${key}`)
        }
        params[key] = { type, value }
      })
    })

    req.q = params
    req.sort = q.sort
    next()
  })

exports.parseSearchingQ = (req, res, next) => {
  const q = parse(req.query.q)
  Object.entries(q.eq).forEach(([key, value]) => (req.query[key] = value))
  Object.entries(q.ne).forEach(([key, value]) => (req.query[key + '_ne'] = value))
  Object.entries(q.gt).forEach(([key, value]) => (req.query[key + '_gt'] = value))
  Object.entries(q.gte).forEach(([key, value]) => (req.query[key + '_gte'] = value))
  Object.entries(q.lt).forEach(([key, value]) => (req.query[key + '_lt'] = value))
  Object.entries(q.lte).forEach(([key, value]) => (req.query[key + '_lte'] = value))
  Object.entries(q.range).forEach(([key, { from, to }]) => {
    if (from !== '*') {
      req.query[key + '_gte'] = from
    }
    if (to !== '*') {
      req.query[key + '_lt'] = to
    }
  })
  req.q = q
  req.sort = q.sort
  next()
}
