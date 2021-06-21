const _ = require('lodash')

const clientGlobalVars = {}

/**
 * @param {string} key
 * @param {any} value
 */
function setClientGlobalVar(key, value) {
  if (clientGlobalVars[key] && typeof clientGlobalVars[key] === 'object') {
    _.merge(clientGlobalVars[key], value)
  } else {
    clientGlobalVars[key] = value
  }
}

/**
 * @param {Record<string, any>} object
 */
function setClientGlobalVars(object) {
  _.merge(clientGlobalVars, object)
}

module.exports = { clientGlobalVars, setClientGlobalVar, setClientGlobalVars }
