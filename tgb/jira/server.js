function jiraServerPlugin(redirectURL) {
  return {
    name: 'TGB_Jira',
    clientGlobalVars: {
      TGB: {
        jira: { redirectURL },
      },
    },
  }
}

module.exports = { jiraServerPlugin }
