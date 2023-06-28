import { useState } from 'react';
import { useMutation } from 'react-query';
import { useTranslation } from 'react-i18next';
import { Route, Routes, useParams, useSearchParams, Link } from 'react-router-dom';
import { http } from '@/leancloud';
import { PageContent, PageHeader } from '@/components/Page';
import { QueryWrapper } from '@/components/QueryWrapper';
import { Button } from '@/components/Button';
import OpenInBrowser from '@/components/OpenInBrowser';
import CheckIcon from '@/icons/Check';
import ThumbDownIcon from '@/icons/ThumbDown';
import ThumbUpIcon from '@/icons/ThumbUp';
import { useAuth } from '@/states/auth';
import { ArticleListItem } from './utils';
import { Helmet } from 'react-helmet-async';
import { intlFormat } from 'date-fns';
import { useFAQs } from '@/api/category';
import { useArticle } from '@/api/article';
import { useRootCategory } from '@/states/root-category';

function RelatedFAQs({ categoryId, articleId }: { categoryId: string; articleId: string }) {
  const { t } = useTranslation();
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
      <h2 className="px-4 py-3 font-bold">{t('faqs.similar')}</h2>
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
            className="flex flex-row items-center justify-center h-[22px] bg-white text-[#888]"
            disabled={isLoading}
          >
            <ThumbUpIcon className="w-[14px] h-[14px] inline-block align-middle" />
          </Button>
          <Button
            onClick={() => vote(-1)}
            secondary
            className="flex items-center justify-center h-[22px] bg-white ml-3 text-[#888] hover:!text-red hover:!border-red focus:!text-red focus:!border-red"
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
  const { t } = useTranslation();
  const { id } = useParams();

  const [search] = useSearchParams();
  const isNotice = search.has('from-notice');

  const articleId = id?.split('-').shift();
  const result = useArticle(articleId!);
  const { data: article } = result;

  const title = isNotice ? t('notice.title') : <span>&nbsp;</span>;

  const product = useRootCategory();
  const feedbackEnabled = !product.meta?.disableFeedback;

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
      {article && (
        <PageContent padding={false}>
          <ArticleContent article={article} showTicketSubmit={isNotice && feedbackEnabled} />
        </PageContent>
      )}
    </QueryWrapper>
  );
}

interface ArticleContentProps {
  article: {
    id?: string;
    title: string;
    contentSafeHTML: string;
    updatedAt: string;
  };
  showTicketSubmit?: boolean;
  showTitle?: boolean;
}

export function ArticleContent({
  article,
  showTicketSubmit = false,
  showTitle = true,
}: ArticleContentProps) {
  const [t, i18n] = useTranslation();
  const { user } = useAuth();

  return (
    <div>
      {showTitle && (
        <div className="py-3 border-b border-gray-100 text-center font-bold">{article.title}</div>
      )}
      <div className="p-4 border-b border-gray-100">
        <OpenInBrowser.Content
          className="text-[13px] mb-6 markdown-body"
          dangerouslySetInnerHTML={{ __html: article.contentSafeHTML }}
        />
        <p className="text-sm text-gray-400">
          {`${t('general.update_date')}: ${intlFormat(new Date(article.updatedAt), {
            // @ts-ignore https://github.com/date-fns/date-fns/issues/3424
            locale: i18n.language,
          })}`}
        </p>
        {article.id && user && <Feedback articleId={article.id} />}
      </div>
      {showTicketSubmit && (
        <div className="px-4 py-5 text-[12px] leading-[1.5] text-[#666] text-center">
          <p>{t('notice.hint')}</p>
          <Link to="/categories">
            <Button secondary className="!px-8 text-base mt-2 text-tapBlue font-bold">
              {t('feedback.title')}
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
    </div>
  );
}

function ArticlePreview() {
  const articleData = localStorage.getItem('TapDesk/articlePreview');
  const article: ArticleContentProps['article'] = articleData
    ? JSON.parse(articleData)
    : {
        title: 'Article title',
        contentSafeHTML: '<p>Article content.</p>'.repeat(5),
        updatedAt: new Date(0).toISOString(),
      };

  return (
    <>
      <PageHeader>Preview</PageHeader>
      <PageContent padding={false}>
        <ArticleContent article={article} />
      </PageContent>
    </>
  );
}

export default function Articles() {
  return (
    <Routes>
      <Route path="preview" element={<ArticlePreview />} />
      <Route path=":id" element={<ArticleDetail />} />
    </Routes>
  );
}
