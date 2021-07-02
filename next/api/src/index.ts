import Koa from 'koa';

const app = new Koa();

app.use(async (ctx) => {
  ctx.body = {
    message: 'hello world!',
  };
});

export function launch(port: number) {
  app.listen(port);
}
