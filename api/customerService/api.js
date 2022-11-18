const AV = require('leancloud-storage')
const { Router } = require('express')

const { requireAuth, catchError, customerServiceOnly } = require('../middleware')

const router = Router().use(requireAuth, customerServiceOnly)

router.get(
  '/',
  catchError(async (req, res) => {
    const role = await new AV.Query(AV.Role).equalTo('name', 'customerService').first()
    if (!role) {
      res.throw(500, 'Missing customer services role')
    }
    const customerServices = await role
      .getUsers()
      .query()
      .ascending('email,username')
      .find({ useMasterKey: true })
    res.json(
      customerServices.map((user) => {
        return {
          id: user.id,
          nid: user.get('nid'),
          email: user.get('email') || '',
          username: user.get('username'),
          name: user.get('name') || '',
          category_ids: user.get('categories')?.map((c) => c.objectId) || [],
        }
      })
    )
  })
)

module.exports = router
