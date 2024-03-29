import { Query } from 'leancloud-storage';
import { ArticleFeedback } from '@/model/ArticleFeedback';
import { ArticleRevision } from '@/model/ArticleRevision';

export const analyzeArticles = async () => {
  const articlesIterator = {
    [Symbol.asyncIterator]() {
      return new Query('FAQTranslation')
        .notEqualTo('private', true)
        .scan(undefined, { useMasterKey: true });
    },
  };
  for await (const article of articlesIterator) {
    if (article.get('revision')) {
      const revision = ArticleRevision.fromAVObject(article.get('revision'));
      const [upvote, downvote] = await Promise.all(
        [1, -1].map((type) =>
          ArticleFeedback.queryBuilder()
            .where('revision', '==', revision.toPointer())
            .where('type', '==', type)
            .count({ useMasterKey: true })
        )
      );
      if (upvote + downvote !== 0) {
        await revision.update(
          {
            upvote,
            downvote,
          },
          { useMasterKey: true }
        );
      }
    }
  }
};
