var AV = require('leanengine');

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
  response.success('Hello world!');
});

AV.Cloud.beforeSave('Ticket', (req, res) => {
  if (!req.currentUser._sessionToken) {
    return res.error('noLogin');
  }
  req.object.set('user', req.currentUser);
  res.success();
})

AV.Cloud.afterSave('Ticket', (req) => {
  const category = req.object.get('category')
  new AV.Query(AV.Role)
  .equalTo('name', 'customerService')
  .first()
  .then((role) => {
    return role.getUsers().query()
    .equalTo('categories', category)
    .find()
  }).then((users) => {
    console.log('>>', users);
  })
})

AV.Cloud.afterUpdate('Ticket', (req) => {
  if (req.object.updatedKeys.indexOf('status') != -1) {
    new AV.Object('OpsLog').save({
      ticket: req.object,
      user: req.currentUser,
      action: 'changeStatus',
      data: {status: req.object.get('status')},
    }).save();
  }
})

AV.Cloud.beforeSave('Reply', (req, res) => {
  if (!req.currentUser._sessionToken) {
    return res.error('noLogin');
  }
  req.object.set('user', req.currentUser);
  res.success();
})

module.exports = AV.Cloud;
