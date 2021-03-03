const AV = require('leanengine')
module.exports = LeanStorageStore

function LeanStorageStore() {
  AV.init({
    appId: process.env.LEANCLOUD_APP_ID,
    appKey: process.env.LEANCLOUD_APP_KEY,
    masterKey: process.env.LEANCLOUD_APP_MASTER_KEY,
  })
  AV.Cloud.useMasterKey()
}

/**
 * Save the migration data.
 *
 * @api public
 */

LeanStorageStore.prototype.save = function (set, fn) {
  return new AV.Query('Migration')
    .first({ useMasterKey: true })
    .catch((err) => {
      if (err.code == 101) {
        // Class or object doesn't exists.
        return null
      }
      throw err
    })
    .then((migration) => {
      if (!migration) {
        migration = new AV.Object('Migration')
      }
      return migration.save({
        lastRun: set.lastRun,
        migrations: set.migrations,
        ACL: new AV.ACL(),
      })
    })
    .then(() => {
      return fn()
    })
    .catch(fn)
}

/**
 * Load the migration data and call `fn(err, obj)`.
 *
 * @param {Function} fn
 * @return {Type}
 * @api public
 */

LeanStorageStore.prototype.load = function (fn) {
  return new AV.Query('Migration')
    .first({ useMasterKey: true })
    .catch((err) => {
      if (err.code == 101) {
        // Class or object doesn't exists.
        return null
      }
      throw err
    })
    .then((migration) => {
      if (!migration) {
        return fn(null, {})
      }
      return fn(null, {
        lastRun: migration.get('lastRun'),
        migrations: migration.get('migrations'),
      })
    })
    .catch(fn)
}
