async function getPaginationList(req, res, query) {
  const { size, skip } = req.query
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
  const [list, count] = await Promise.all([
    query.find({ useMasterKey: true }),
    query.count({
      useMasterKey: true,
    }),
  ])
  res.append('X-Total-Count', count)
  res.append('Access-Control-Expose-Headers', 'X-Total-Count')
  return list
}

module.exports = {
  getPaginationList,
}
