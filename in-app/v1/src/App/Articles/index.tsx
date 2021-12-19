import { useQuery } from 'react-query';
import { Link, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { Article } from 'types';
import { http } from 'leancloud';
import { PageContent, PageHeader } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import { ArticleLink, useFAQs } from './utils';
import { useAuth } from '..';
import { Button } from '@/components/Button';

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
    <div className="m-4 pb-2 bg-gray-50">
      <h2 className="px-5 py-3 font-bold">类似问题</h2>
      {relatedFAQs.map((FAQ) => (
        <ArticleLink
          article={FAQ}
          fromCategory={categoryId}
          key={FAQ.id}
          className="block px-5 py-1.5 text-tapBlue"
        />
      ))}
    </div>
  );
}

function ArticleDetail() {
  const { id } = useParams();
  const result = useArticle(id!);
  const { data: article } = result;

  const [search] = useSearchParams();
  const categoryId = search.get('from-category');

  const [auth, loading, error] = useAuth();

  return (
    <QueryWrapper result={result}>
      <PageHeader>{article?.title}</PageHeader>
      <PageContent>
        <div
          className="p-4 bg-gray-50 border-b border-gray-100 markdown-body"
          dangerouslySetInnerHTML={{ __html: article?.contentSafeHTML ?? '' }}
        />
        {categoryId && auth && (
          <p className="mt-4 px-4">
            仍然需要帮助？{' '}
            <Button
              as={Link}
              to={`/tickets/new?category_id=${categoryId}`}
              className="inline-block"
            >
              联系客服
            </Button>
          </p>
        )}
        {categoryId && id && <RelatedFAQs categoryId={categoryId} articleId={id} />}
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
