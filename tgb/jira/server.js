const AV = require('leanengine')

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

AV.Cloud.define('TGB_getJiraAccessToken', async (req) => {
  if (!req.currentUser) {
    throw new AV.Cloud.Error('Unauthorized', { status: 401 })
  }
  await req.currentUser.fetch({ keys: 'authData' }, { useMasterKey: true })
  return req.currentUser.get('authData')?.jira?.access_token ?? ''
})

module.exports = { jiraServerPlugin }
