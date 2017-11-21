const Raven = require('raven')

exports.captureException = (message, err) => {
  if (message instanceof Error) {
    err = message
    message = ''
  }
  console.error(message, err.stack)
  Raven.captureException(err, {
    extra: {
      message: message
    }
  })
}
