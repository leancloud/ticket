const { app } = require('./api/dist');

app.listen(4000, () => {
  console.log('Launched');
});
