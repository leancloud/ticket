import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Route, Switch, useParams, useRouteMatch } from 'react-router-dom';
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
  const { id } = useParams<{ id: string }>();
  const result = useArticle(id);
  const { data: article, isLoading, error } = result;

  return (
    <QueryWrapper result={result}>
      <PageHeader>{article?.title}</PageHeader>
      <PageContent>
        <div
          className="px-5 py-3 markdown-body"
          dangerouslySetInnerHTML={{ __html: article?.contentSafeHTML ?? '' }}
        ></div>
      </PageContent>
    </QueryWrapper>
  );
}

export default function Articles() {
  const { path } = useRouteMatch();

  return (
    <Switch>
      <Route path={`${path}/:id`}>
        <ArticleDetail />
      </Route>
    </Switch>
  );
}
