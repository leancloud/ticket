const { createInterface } = require('node:readline');
const AV = require('leancloud-storage');

/**
 * @param {Date} cursor
 * @returns {Promise<AV.Object[]>}
 */
function getLegacyArticles(cursor) {
  const query = new AV.Query('FAQ');
  query._where = {
    $and: [
      {
        private: true,
      },
      {
        $or: [
          {
            publishedFrom: { $exists: false },
          },
          {
            publishedTo: { $exists: false },
          },
        ],
      },
    ],
  };
  query.addAscending('createdAt');
  if (cursor) {
    query.greaterThan('createdAt', cursor);
  }
  return query.find({ useMasterKey: true });
}

/**
 * @param {AV.Object[]} articles
 */
function updateLegacyArticles(articles) {
  for (const article of articles) {
    article.set('publishedFrom', new Date(0));
    article.set('publishedTo', new Date(0));
  }
  return AV.Object.saveAll(articles, { useMasterKey: true });
}

async function migrate() {
  let count = 0;
  let finish = false;
  let cursor;
  while (!finish) {
    const articles = await getLegacyArticles(cursor);
    await updateLegacyArticles(articles);
    count += articles.length;
    finish = articles.length === 0;
    if (!finish) {
      cursor = articles[articles.length - 1].createdAt;
    }
  }
  return count;
}

/**
 * @param {(info: { appId: string; masterKey: string; serverURL: string }) => void} cb
 */
function readAppInfo(cb) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('App ID: ', (appId) => {
    rl.question('Master Key: ', (masterKey) => {
      rl.question('Server URL: ', (serverURL) => {
        rl.close();
        cb({ appId, masterKey, serverURL });
      });
    });
  });
}

async function main() {
  readAppInfo(({ appId, masterKey, serverURL }) => {
    AV.init({ appId, masterKey, serverURL, appKey: 'WHATEVER' });
    migrate().then((count) => {
      console.log(`${count} article(s) migrated`);
    });
  });
}

main();
