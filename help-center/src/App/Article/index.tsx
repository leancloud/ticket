import { useMemo } from 'react';
import { useParams, Link, useMatch } from 'react-router-dom';
import { intlFormat } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { QueryWrapper } from '@/components/QueryWrapper';
import { Breadcrumb, ItemProps } from '@/components/Breadcrumb';
import { useArticle } from '@/api/article';
import { useCategoryTopics } from '@/api/category';

const Help = () => {
  const [t] = useTranslation();
  return (
    <div className="bg-background rounded mt-[60px] p-4 text-center">
      <div className="text-[16px] text-[#909090] mb-4">{t('help.title')}</div>
      <div className="flex justify-center">
        <Link
          className="mr-2 border bg-primary rounded py-2 px-3 text-white hover:text-white"
          to="/categories"
        >
          {t('help.submit_ticket')}
        </Link>
        {/* <Link
          className="mr-2 border bg-primary rounded py-2 px-3 text-white hover:text-white"
          to="/"
        >
          {t('help.chat')}
        </Link> */}
      </div>
    </div>
  );
};

export default function Article() {
  const [t, i18n] = useTranslation();
  let { articleId, topicId } = useParams();

  articleId = articleId?.split('-').shift();

  const { data: topics, isLoading: isTopicLoading } = useCategoryTopics();
  const topic = topics?.find((item) => item.id === topicId);

  const result = useArticle(articleId!);
  const { data: article, isLoading: isArticleLoading } = result;

  const items = useMemo(() => {
    const res: ItemProps[] = [];
    if (topic) {
      res.push({ title: topic?.name, href: `/topic/${topic.id}` });
    }
    if (article) {
      res.push({ title: article.title });
    }
    return res;
  }, [topic, article]);

  return (
    <div className="content">
      <QueryWrapper result={result}>
        <Breadcrumb items={items} />
        {article && (
          <>
            <Helmet>
              <title>{article.title}</title>
              <meta property="og:type" content="article" />
              <meta property="og:title" content={article.title} />
              <meta property="og:description" content={article.content.split('\n')[0]} />
            </Helmet>
            <div className="content-inner mt-4">
              <>
                <div className="text-center font-bold pb-3 text-xl">{article.title}</div>
                <div className="pt-2">
                  <div
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: article.contentSafeHTML }}
                  />
                  <p className="pt-1 text-gray-400">
                    {`${t('general.update_at')}: ${intlFormat(new Date(article.updatedAt), {
                      // @ts-ignore https://github.com/date-fns/date-fns/issues/3424
                      locale: i18n.language,
                    })}`}
                  </p>
                </div>
                <Help />
              </>
            </div>
          </>
        )}
      </QueryWrapper>
    </div>
  );
}
