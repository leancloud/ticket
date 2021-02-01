const router = require('express').Router()
const AV = require('leanengine')

router.get('/:id/redirection', async (req, res) => {
  const id = req.params.id
  const file = AV.File.createWithoutData(id)
  try {
    const url = (await file.fetch()).url()
    if (url) {
      res.redirect(url)
    } else {
      res.sendStatus(404)
    }
  } catch (error) {
    console.error('fetch file failed:', error)
    res.sendStatus(500)
  }
})

module.exports = router
