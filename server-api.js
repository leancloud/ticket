var api = require('./api');

var PORT = parseInt(process.env.LEANCLOUD_APP_PORT || process.env.PORT || 3000);
api.listen(PORT, function () {
  console.log('Ticket API is running, port:', PORT);
});
