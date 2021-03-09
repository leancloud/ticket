const _ = require('lodash')

const clientGlobalVars = {}

function setClientGlobalVar(key, value) {
  if (clientGlobalVars[key] && typeof clientGlobalVars[key] === 'object') {
    _.merge(clientGlobalVars[key], value)
  } else {
    clientGlobalVars[key] = value
  }
}

function setClientGlobalVars(object) {
  _.merge(clientGlobalVars, object)
}

module.exports = { clientGlobalVars, setClientGlobalVar, setClientGlobalVars }
