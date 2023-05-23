import AV from 'leanengine';

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY,
});

/**
 *
 * @param {string} className
 * @returns {Promise<AV.Queriable[]>}
 */
const findAll = async (className, skip = 0) => {
  const result = await new AV.Query(className).limit(1000).skip(skip).find({ useMasterKey: true });

  if (result.length === 1000) {
    const nextResult = await findAll(className, skip + 1000);
    return [...result, ...nextResult];
  }

  return result;
};

/**
 * @param {{ all?: any[]; any?: any[]; }} param0
 * @returns {{ [key: string]: any; type: string; } | undefined}
 */
const convertConditions = ({ all, any } = {}) => {
  const or = any && any.length ? { type: 'any', conditions: [...any] } : undefined;
  const and = all && all.length ? { type: 'all', conditions: [...all] } : undefined;

  const res = {
    type: 'all',
    conditions: [or, and]
      .filter(Boolean)
      .map((v) => (v.conditions.length === 1 ? v.conditions[0] : v)),
  };

  return res.conditions.length === 1 ? res.conditions[0] : res;
};

const run = async () => {
  const oldViews = await findAll('View');

  console.log('Start View migration...');

  await AV.Object.saveAll(
    oldViews.map((view) => view.set('conditions', convertConditions(view.get('conditions')))),
    { useMasterKey: true }
  );

  console.log('End View migration');
};

await run();
