import { Link } from 'react-router-dom';

import { Button, Radio, Spin, Table } from '@/components/antd';
import { usePage, usePageSize } from '@/utils/usePage';
import { Article, useArticles } from '@/api/article';
import { useSearchParam } from '@/utils/useSearchParams';
import { ArticleStatus } from './components/ArticleStatus';

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
            key="status"
            render={(article: Article) => <ArticleStatus article={article} />}
          />
          <Column title="开始时间" dataIndex="publishedFrom" render={renderPublishedDate} />
          <Column title="结束时间" dataIndex="publishedTo" render={renderPublishedDate} />
        </Table>
      )}
    </div>
  );
}

function renderPublishedDate(value: string) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (date.getTime() === 0) {
    return '-';
  }
  return date.toLocaleString();
}
