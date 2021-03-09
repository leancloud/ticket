const _ = require('lodash')

const globalVars = {}

function setGlobalVar(key, value) {
  if (globalVars[key] && typeof globalVars[key] === 'object') {
    _.merge(globalVars[key], value)
  } else {
    globalVars[key] = value
  }
}

function setGlobalVars(object) {
  _.merge(globalVars, object)
}

module.exports = { globalVars, setGlobalVar, setGlobalVars }
