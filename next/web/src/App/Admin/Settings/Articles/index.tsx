import { Link } from 'react-router-dom';

import { Button, Radio, Spin, Table, Typography } from '@/components/antd';
import { usePage, usePageSize } from '@/utils/usePage';
import { Article, useArticles } from '@/api/article';
import { useSearchParam } from '@/utils/useSearchParams';
import { ArticleStatus } from './components/ArticleStatus';
import { ToggleArticlePrivateButton } from './components/TogglePrivateButton';

const { Column } = Table;

const PrivateQueryValue: { [key: string]: boolean | undefined } = {
  true: true,
  false: false,
  unset: undefined,
};

export function Articles() {
  const [filter = 'unset', setFilter] = useSearchParam('status');
  const [page, { set: setPage }] = usePage();
  const [pageSize = 20, setPageSize] = usePageSize();
  const { data: articles, totalCount, isLoading } = useArticles({
    page,
    pageSize,
    count: 1,
    private: PrivateQueryValue[filter],
    queryOptions: {
      keepPreviousData: true,
    },
  });

  return (
    <div className="px-10 pt-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">文章</h1>
      <div className="flex flex-row items-center mb-4">
        <div className="grow">
          <Radio.Group value={filter} onChange={(e) => setFilter(e.target.value)} size="small">
            <Radio.Button value="unset">全部</Radio.Button>
            <Radio.Button value="true">未发布</Radio.Button>
            <Radio.Button value="false">已发布</Radio.Button>
          </Radio.Group>
        </div>
        <Link to="new">
          <Button type="primary">创建文章</Button>
        </Link>
      </div>

      {isLoading && <div className="h-80 my-40 text-center" children={<Spin />} />}

      {articles && (
        <Table
          dataSource={articles}
          rowKey="id"
          pagination={{
            pageSize,
            onChange: (page, size) => {
              setPage(page);
              setPageSize(size);
            },
            current: page,
            total: totalCount,
          }}
        >
          <Column
            title="标题"
            dataIndex="name"
            render={(title, article: Article) => <Link to={article.id}>{title}</Link>}
          />
          <Column
            title="状态"
            dataIndex="private"
            render={(_, article: Article) => <ArticleStatus article={article} />}
          />
          <Column
            title="开始时间"
            dataIndex="publishedFrom"
            render={(value) => (value ? new Date(value).toLocaleString() : '-')}
          />
          <Column
            title="结束时间"
            dataIndex="publishedTo"
            render={(value) => (value ? new Date(value).toLocaleString() : '-')}
          />
          <Column
            title="操作"
            render={(_, article: Article) => (
              <div className="flex flex-row space-x-1">
                <ToggleArticlePrivateButton article={article} />
              </div>
            )}
          />
        </Table>
      )}
    </div>
  );
}
