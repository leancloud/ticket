import { useQuery } from 'react-query';
import { Route, Routes, useParams } from 'react-router-dom';
import { Article } from 'types';
import { http } from 'leancloud';
import { PageContent, PageHeader } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';

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

function ArticleDetail() {
  const { id } = useParams();
  const result = useArticle(id!);
  const { data: article } = result;

  return (
    <QueryWrapper result={result}>
      <PageHeader>{article?.title}</PageHeader>
      <PageContent>
        <div
          className="px-5 py-3 markdown-body"
          dangerouslySetInnerHTML={{ __html: article?.contentSafeHTML ?? '' }}
        />
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
