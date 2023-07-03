const { createInterface } = require('node:readline');
const AV = require('leancloud-storage');
const _ = require('lodash');

main();

async function main() {
  readAppInfo(({ appId, masterKey, serverURL }) => {
    AV.init({ appId, masterKey, serverURL, appKey: 'WHATEVER' });
    migrate().then((count) => {
      console.log(`${count} replies migrated`);
    });
  });
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

class ReplyRevisionScanner {
  /**
   * @type {string | null}
   */
  _cursor = null;

  /**
   * @returns {Promise<AV.Object[]>}
   */
  async scan(maxCount = 100) {
    const query = new AV.Query('ReplyRevision');
    query.addAscending('createdAt');
    if (this._cursor) {
      query.greaterThan('createdAt', this._cursor);
    }
    query.limit(maxCount);
    const revisions = await query.find({ useMasterKey: true });
    if (revisions.length) {
      this._cursor = revisions[revisions.length - 1].createdAt;
    }
    return revisions;
  }

  async next() {
    const revisions = await this.scan();
    return {
      value: revisions,
      done: revisions.length === 0,
    };
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}

async function migrate() {
  let count = 0;
  for await (const revisions of new ReplyRevisionScanner()) {
    const replyIds = _(revisions)
      .map((r) => r.get('reply')?.id)
      .compact()
      .uniq()
      .value();

    let replies = await new AV.Query('Reply')
      .containedIn('objectId', replyIds)
      .find({ useMasterKey: true });

    replies = replies.filter((reply) => !reply.has('edited'));

    if (replies.length) {
      replies.forEach((reply) => reply.set('edited', true));

      await AV.Object.saveAll(replies, { useMasterKey: true });
      count += replies.length;
    }
  }
  return count;
}
