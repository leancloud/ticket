// also required by server hook
const { Realtime, TypedMessage, messageType, messageField } = require('leancloud-realtime')

class NotificationMessage extends TypedMessage {
  constructor(payload) {
    super()
    this.payload = payload
  }
}
messageType(100)(NotificationMessage)
messageField(['payload'])(NotificationMessage)

class NewReplyNotificaion extends NotificationMessage {}
messageType(101)(NewReplyNotificaion)

const realtime = new Realtime({
  appId: process.env.LEANCLOUD_APP_ID,
})
realtime.register([NewReplyNotificaion])

let clientPromise = null

module.exports = {
  NotificationMessage,
  NewReplyNotificaion,
  login(id) {
    clientPromise = 
      (clientPromise ? this.logout() : Promise.resolve())
      .then(() => realtime.createIMClient(id))
    return clientPromise
  },
  logout() {
    return clientPromise.then(client => client.close()).then(() => {
      clientPromise = null
    })
  },
  getClient() {
    return clientPromise || Promise.reject(new Error('Notification service not logged in'))
  },
}