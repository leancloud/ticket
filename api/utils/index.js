/**
 *
 * @param {*} res
 * @param {*} count number
 * @returns res
 */
const TOTAL_COUNT_KEY = 'X-Total-Count'
function responseAppendCount(res, count) {
  res.append(TOTAL_COUNT_KEY, count)
  res.append('Access-Control-Expose-Headers', TOTAL_COUNT_KEY)
  return res
}

module.exports = {
  responseAppendCount,
}
