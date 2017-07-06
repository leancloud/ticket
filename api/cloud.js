const AV = require('leanengine')

const common = require('./common')

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
  response.success('Hello world!')
})

AV.Cloud.define('contentHtml', (_req) => {
  return addHtml()
})

const addHtml = () => {
  return new AV.Query('Reply')
  .doesNotExist('content_HTML')
  .select('content')
  .limit(1000)
  .find({useMasterKey: true})
  .then(objs => {
    if (objs.length === 0) {
      return 'done'
    }
    objs.forEach(obj => {
      obj.set('content_HTML', common.htmlify(obj.get('content')))
    })
    return AV.Object.saveAll(objs, {useMasterKey: true})
    .then(() => {
      return addHtml()
    })
  })
}
