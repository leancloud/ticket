// also required by server hook
const { Realtime, TypedMessage, messageType, messageField } = require('leancloud-realtime')
const AV = require('leancloud-storage')

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

let clientPromise = null

module.exports = {
  NotificationMessage,
  NewReplyNotificaion,
  login(id) {
    if (!this.realtime) {
      this.realtime = new Realtime({
        appId: AV.applicationId
      })
      this.realtime.register([NewReplyNotificaion])
    }
    clientPromise = 
      (clientPromise ? this.logout() : Promise.resolve())
      .then(() => this.realtime.createIMClient(id))
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
