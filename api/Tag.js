const AV = require('leanengine')

const errorHandler = require('./errorHandler')

AV.Cloud.beforeSave('Tag', (req, res) => {
  if (!req.currentUser._sessionToken) {
    return res.error('noLogin')
  }
  getTagAcl(req.object, req.currentUser).then((acl) => {
    req.object.setACL(acl)
    req.object.set('author', req.currentUser)
    res.success()
    return
  }).catch(errorHandler.captureException)
})

const getTagAcl = (tag, author) => {
  return tag.get('ticket').fetch({
    include: 'author'
  }, {user: author})
  .then((ticket) => {
    const acl = new AV.ACL()
    acl.setWriteAccess(author, true)
    acl.setReadAccess(author, true)
    acl.setReadAccess(ticket.get('author'), true)
    acl.setRoleReadAccess(new AV.Role('customerService'), true)
    return acl
  })
}
