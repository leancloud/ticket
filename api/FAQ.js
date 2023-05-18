const AV = require('leanengine')
const LRUCache = require('lru-cache')
const sortKeys = require('sort-keys')

const MAX_FAQ_CACHE_SIZE = Number(process.env.MAX_FAQ_CACHE_SIZE || 20)
const MAX_FAQ_CACHE_AGE = Number(process.env.MAX_FAQ_CACHE_AGE || 600 * 1000)

const FAQCache = new LRUCache({
  max: MAX_FAQ_CACHE_SIZE,
  maxAge: MAX_FAQ_CACHE_AGE,
})

const FAQ_VIEWS = (process.env.FAQ_VIEWS || '').split(',').filter((view) => view)

AV.Cloud.define('getFAQs', async (req) => {
  let { where = {}, limit = 20, order, select, view } = req.params

  if (view) {
    if (FAQ_VIEWS.indexOf(view) === -1) {
      throw new AV.Cloud.Error(`view [${view}] is not supported`, {
        status: 400,
      })
    }
    order = `-priority_${view}`
    where = { ...where, [`priority_${view}`]: { $gt: 0 } }
  }

  const key = JSON.stringify(sortKeys({ where, limit, order, select }, { deep: true }))

  const cachedFAQs = FAQCache.get(key)
  if (cachedFAQs) {
    return cachedFAQs
  }

  const query = new AV.Query('FAQ')
  query._where = where
  query.limit(limit)
  if (select) {
    query.select(select)
  }
  query._order = order
  const FAQs = await query.find()

  FAQCache.set(key, FAQs)
  return FAQs
})
