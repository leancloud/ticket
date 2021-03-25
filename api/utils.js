const AV = require('leanengine')

const { isCustomerService } = require('./common')

/**
 *
 * @param {AV.Cloud.CloudFunctionRequest} req
 * @param {boolean} [mustCustomerService]
 */
async function requireAuth(req, mustCustomerService = false) {
  if (!req.currentUser) {
    throw new AV.Cloud.Error('Unauthorized', { status: 401 })
  }
  if (mustCustomerService && !(await isCustomerService(req.currentUser))) {
    throw new AV.Cloud.Error('Forbidden', { status: 403 })
  }
}

module.exports = { requireAuth }
