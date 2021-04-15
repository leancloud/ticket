const AV = require('leancloud-storage')
const { validationResult } = require('express-validator')
const { isCustomerService } = require('../common')

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
    throw error
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

exports.catchError = (handler) => {
  return async (req, res, next, ...args) => {
    res.throw = (status = 500, message = 'Internal Error') => {
      const error = new Error(message)
      error.status = status
      throw error
    }
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        const { msg, param } = errors.array()[0]
        const error = new Error(msg === 'Invalid value' ? `Invalid ${param}` : msg)
        error.status = 400
        throw error
      }
      await handler(req, res, next, ...args)
    } catch (error) {
      if (error.code === 101) {
        error.status = 404
      }
      console.error(error)
      next(error)
    }
  }
}
