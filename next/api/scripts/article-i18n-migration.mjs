import AV from 'leanengine';

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY,
});

/**
 *
 * @param {string} className
 */
const findAll = async (className, skip = 0) => {
  const result = await new AV.Query(className).limit(1000).skip(skip).find({ useMasterKey: true });

  if (result.length === 1000) {
    const nextResult = await findAll(className, skip + 1000);
    return [...result, ...nextResult];
  }

  return result;
};

const run = async () => {
  const oldArticles = await findAll('FAQ');
  const oldRevision = await findAll('FAQRevision');
  const oldFeedback = await findAll('FAQFeedback');

  console.log('Start FAQTranslation migration...');

  const translations = await AV.Object.saveAll(
    oldArticles.map(
      (article) =>
        new AV.Object('FAQTranslation')
          .set('article', article)
          .set('content', article.get('answer'))
          .set('contentHTML', article.get('answer_HTML'))
          .set('deletedAt', article.get('deletedAt'))
          .set('language', 'zh-cn')
          .set('private', article.get('archived'))
          .set('revision', article.get('revision'))
          .set('title', article.get('question'))
      // .set('createdAt', article.get('createdAt'))
      // .set('updatedAt', article.get('updatedAt'))
    ),
    { useMasterKey: true }
  );

  console.log('End FAQTranslation migration');

  const translationArticleMap = new Map(
    translations.map((translation) => [translation.get('article').get('objectId'), translation])
  );

  console.log('Start FAQ migration...');

  await AV.Object.saveAll(
    oldArticles.map((article) =>
      article
        .set('defaultLanguage', 'zh-cn')
        .set('name', article.get('question'))
        .set('private', article.get('archived'))
    ),
    { useMasterKey: true }
  );

  console.log('End FAQ migration');
  console.log('Start FAQRevision migration...');

  await AV.Object.saveAll(
    oldRevision.map((revision) =>
      revision.set('FAQTranslation', translationArticleMap.get(revision.get('FAQ').get('objectId')))
    ),
    { useMasterKey: true }
  );

  console.log('End FAQRevision migration');
  console.log('Start FAQFeedback migration...');

  await AV.Object.saveAll(
    oldFeedback.map((feedback) =>
      feedback.set('FAQTranslation', translationArticleMap.get(feedback.get('FAQ').get('objectId')))
    ),
    { useMasterKey: true }
  );

  console.log('End FAQFeedback migration');
};

await run();
