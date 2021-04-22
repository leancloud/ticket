const AV = require('leanengine')

const { Automations } = require('./automation')

async function getActiveAutomations() {
  const query = new AV.Query('Automation')
    .equalTo('active', true)
    .addAscending('position')
    .addAscending('createdAt')
  const objects = await query.find({ useMasterKey: true })
  return new Automations(objects.map((o) => o.toJSON()))
}

module.exports = { getActiveAutomations }
