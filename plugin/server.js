const { setGlobalVars } = require('../globalVar')

function useServerPlugin(plugin) {
  console.log('Using plugin:', plugin.name)
  if (plugin.globalVars) {
    setGlobalVars(plugin.globalVars)
  }
}

module.exports = { useServerPlugin }
