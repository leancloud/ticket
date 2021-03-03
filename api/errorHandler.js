const Raven = require('raven')

exports.captureException = (message, err) => {
  if (message instanceof Error) {
    err = message
    message = ''
  }
  let extra = message
  if (typeof message == 'string') {
    extra = { message }
  }
  console.error(message, err.stack)
  Raven.captureException(err, { extra })
}
