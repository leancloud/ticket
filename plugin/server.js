const { setClientGlobalVars } = require('../clientGlobalVar')

function useServerPlugin(plugin) {
  console.log('Using plugin:', plugin.name)
  if (plugin.clientGlobalVars) {
    setClientGlobalVars(plugin.clientGlobalVars)
  }
}

module.exports = { useServerPlugin }
