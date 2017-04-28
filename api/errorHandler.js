exports.captureException = (message, err) => {
  if (message instanceof Error) {
    err = message
    message = null
  }
  console.error(err.stack)
}
