const AV = require('leancloud-storage')
const { Router } = require('express')
const { query } = require('express-validator')

const { catchError } = require('../middleware')

/**
 * @param {AV.Object} file
 */
function encodeFileObject(file) {
  return {
    id: file.id,
    name: file.get('name'),
    mime: file.get('mime_type'),
    url: file.get('url'),
  }
}

const router = Router()

router.get(
  '/',
  query('ids').isString().isLength({ min: 1 }),
  catchError(async (req, res) => {
    const ids = req.query.ids.split(',')
    const query = new AV.Query('_File')
    query.containedIn('objectId', ids)
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
