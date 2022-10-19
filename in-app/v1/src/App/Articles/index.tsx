import { useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { Route, Routes, useParams, useSearchParams, Link } from 'react-router-dom';
import { Article } from '@/types';
import { http } from '@/leancloud';
import { PageContent, PageHeader } from '@/components/NewPage';
import { QueryWrapper } from '@/components/QueryWrapper';
import { Button } from '@/components/Button';
import CheckIcon from '@/icons/Check';
import ThumbDownIcon from '@/icons/ThumbDown';
import ThumbUpIcon from '@/icons/ThumbUp';
import { useAuth } from '..';
import { ArticleListItem, useFAQs } from './utils';
import { Helmet } from 'react-helmet-async';

async function getArticle(id: string) {
  return (await http.get<Article>(`/api/2/articles/${id}`)).data;
}

function useArticle(id: string) {
  return useQuery({
    queryKey: ['article', id],
    queryFn: () => getArticle(id),
    staleTime: 60_000,
  });
}

function RelatedFAQs({ categoryId, articleId }: { categoryId: string; articleId: string }) {
  const { data: FAQs, isLoading: FAQsIsLoading, isSuccess: FAQsIsReady } = useFAQs(categoryId);
  if (!FAQs) {
    return null;
  }
  const relatedFAQs = FAQs.filter((faq) => faq.id !== articleId);
  if (relatedFAQs.length === 0) {
    return null;
  }
  return (
    <div className="pt-6 pb-2">
      <h2 className="px-4 py-3 font-bold">类似问题</h2>
      {relatedFAQs.map((FAQ) => (
        <ArticleListItem article={FAQ} fromCategory={categoryId} key={FAQ.id} />
      ))}
    </div>
  );
}
enum FeedbackType {
  Upvote = 1,
  Downvote = -1,
}
async function feedback(articleId: string, type: FeedbackType) {
  return await http.post(`/api/2/articles/${articleId}/feedback`, {
    type,
  });
}

function Feedback({ articleId }: { articleId: string }) {
  const { t } = useTranslation();
  const [voted, setVoted] = useState(false);
  const { mutateAsync: vote, isLoading } = useMutation({
    mutationFn: (type: FeedbackType) => feedback(articleId, type),
    onSuccess: () => setVoted(true),
    onError: (error: Error) => alert(error.message),
  });

  return (
    <div className="mt-6 text-gray-600 flex items-center text-sm h-6">
      {voted ? (
        <>
          <div className="flex w-4 h-4 bg-tapBlue rounded-full mr-2">
            <CheckIcon className="w-1.5 h-1.5 m-auto text-white" />
          </div>
          {t('evaluation.created_text')}
        </>
      ) : (
        <>
          <Button
            onClick={() => vote(1)}
            secondary
            className="flex flex-row items-center min-w-[32px] h-[22px] bg-white text-[#888]"
            disabled={isLoading}
          >
            <ThumbUpIcon className="w-[14px] h-[14px] inline-block align-middle" />
          </Button>
          <Button
            onClick={() => vote(-1)}
            secondary
            className="flex items-center min-w-[32px] h-[22px] bg-white ml-4 text-[#888] hover:!text-red hover:!border-red focus:!text-red focus:!border-red"
            disabled={isLoading}
          >
            <ThumbDownIcon className="w-[14px] h-[14px] inline-block align-middle" />
          </Button>
        </>
      )}
    </div>
  );
}

function ArticleDetail() {
  const [t] = useTranslation();
  const { id } = useParams();
  const articleId = id?.split('-').shift();
  const result = useArticle(articleId!);
  const { data: article } = result;

  const [search] = useSearchParams();
  const categoryId = search.get('from-category');
  const isNotice = !!search.get('from-notice');

  const [auth, loading, error] = useAuth();
  const title = !!isNotice ? t('notice.title') : t('ticket.detail');

  return (
    <QueryWrapper result={result}>
      {article && (
        <Helmet>
          <title>{article.title}</title>
          <meta property="og:type" content="article" />
          <meta property="og:title" content={article.title} />
          <meta property="og:description" content={article.content.split('\n')[0]} />
        </Helmet>
      )}
      <PageHeader>{title}</PageHeader>
      <PageContent className="py-0 px-0">
        <div className="px-4 py-3 border-b border-gray-100 text-center font-bold">
          {article?.title}
        </div>
        <div className="p-4 border-b border-gray-100">
          <div
            className="text-[13px] markdown-body"
            dangerouslySetInnerHTML={{ __html: article?.contentSafeHTML ?? '' }}
          />
          {article && auth && <Feedback articleId={article.id} />}
        </div>
        {isNotice && (
          <div className="px-4 py-5 text-[12px] leading-[1.5] text-[#666] text-center">
            <p>{t('notice.hint')}</p>
            <Link to="/topCategories">
              <Button secondary className="px-8 text-base mt-2 text-tapBlue font-bold">
                {t('feedback.submit')}
              </Button>
            </Link>
          </div>
        )}
        {/* {categoryId && auth && (
          <p className="my-6 px-4 text-center">
            <span className="block mb-2 text-sm">若以上内容没有帮助到你</span>
            <NewTicketButton categoryId={categoryId} />
          </p>
        )} */}
        {/* {categoryId && id && <RelatedFAQs categoryId={categoryId} articleId={id} />} */}
      </PageContent>
    </QueryWrapper>
  );
}

export default function Articles() {
  return (
    <Routes>
      <Route path=":id" element={<ArticleDetail />} />
    </Routes>
  );
}
