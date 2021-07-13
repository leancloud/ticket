const { app } = require('./api/dist');

app.listen(4000, () => {
  console.log('[Next API] Launched');
});
