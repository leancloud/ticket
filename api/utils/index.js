async function getLimitationData(conditions, query) {
  const { size, skip } = conditions
  if (size) {
    const limit = parseInt(size)
    if (!Number.isNaN(limit)) {
      query.limit(limit)
    }
  }
  if (skip) {
    const num = parseInt(skip)
    if (!Number.isNaN(num)) {
      query.skip(num)
    }
  }
  return await Promise.all([
    query.find({ useMasterKey: true }),
    query.count({
      useMasterKey: true,
    }),
  ])
}

const TOTAL_COUNT_KEY = 'X-Total-Count'
/**
 * 
 * @param {*} res 
 * @param {*} count number
 * @returns res
 */
function responseAppendCount(res, count) {
  res.append(TOTAL_COUNT_KEY, count)
  res.append('Access-Control-Expose-Headers', TOTAL_COUNT_KEY)
  return res
}

module.exports = {
  getLimitationData,
  responseAppendCount,
}
