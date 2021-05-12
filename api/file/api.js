const AV = require('leancloud-storage')
const { Router } = require('express')

const { catchError, parseSearching } = require('../middleware')
const { encodeFileObject } = require('./utils')

const router = Router()

router.get(
  '/',
  parseSearching({
    id: {
      eq: null,
    },
  }),
  catchError(async (req, res) => {
    const q = req.q
    const query = new AV.Query('_File')
    if (q.id) {
      res.throw(400, 'query[q.id] is required')
    }
    query.containedIn('objectId', q.id.value.split(','))
    const files = await query.find()
    res.json(files.map(encodeFileObject))
  })
)

router.param(
  'id',
  catchError(async (req, res, next, id) => {
    req.file = await new AV.Query('_File').get(id)
    next()
  })
)

router.get('/:id', (req, res) => {
  res.json(encodeFileObject(req.file))
})

router.get('/:id/redirection', (req, res) => {
  res.redirect(req.file.get('url'))
})

module.exports = router
