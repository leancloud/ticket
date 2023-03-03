import { Breadcrumb, Radio, Spin, Table, Tag, Typography } from 'antd';
import {
  ArticleRevisionListItem,
  useArticleRevision,
  useArticleRevisions,
} from '@/api/article-revision';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import { usePage, usePageSize } from '@/utils/usePage';
import { useSearchParam } from '@/utils/useSearchParams';
import { QueryResult } from '@/components/common';
import { FeedbackSummary } from './FeedbackSummary';
import { LOCALES } from '@/i18n/locales';

const { Column } = Table;
const { Title } = Typography;

const MetaQueryValue: { [key: string]: boolean | undefined } = {
  true: true,
  false: false,
  unset: undefined,
};

export function ArticleRevisions() {
  const { id: articleId, language } = useParams();
  const [page, { set: setPage }] = usePage();
  const [pageSize = 20, setPageSize] = usePageSize();
  const [metaFilter = 'unset', setMetaFilter] = useSearchParam('meta');

  const { data: revisions, totalCount, isLoading } = useArticleRevisions(articleId!, language!, {
    page,
    pageSize,
    count: 1,
    meta: MetaQueryValue[metaFilter],
    queryOptions: {
      keepPreviousData: true,
    },
  });

  return (
    <div className="p-10">
      <div className="flex justify-center mb-1">
        <Breadcrumb className="grow">
          <Breadcrumb.Item>
            <Link to="../../../..">文章</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="../../..">{articleId}</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>{LOCALES[language!]}</Breadcrumb.Item>
          <Breadcrumb.Item className="text-gray-300">历史</Breadcrumb.Item>
        </Breadcrumb>
      </div>
      <Title level={2}>历史</Title>

      <div className="flex flex-row mb-4">
        <div className="grow">
          <Radio.Group
            value={metaFilter}
            onChange={(e) => setMetaFilter(e.target.value)}
            size="small"
          >
            <Radio.Button value="unset">全部</Radio.Button>
            <Radio.Button value="false">内容变更</Radio.Button>
            <Radio.Button value="true">发布记录</Radio.Button>
          </Radio.Group>
        </div>
      </div>

      {isLoading && <div className="h-80 my-40 text-center" children={<Spin />} />}

      {revisions && (
        <Table
          dataSource={revisions}
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
            title="变更"
            dataIndex="id"
            render={(id, revision: ArticleRevisionListItem) =>
              revision.meta ? (
                <>
                  {revision.private ? '撤销发布' : '发布'}{' '}
                  {revision.comment && (
                    <span className="text-gray-400 text-sm">{revision.comment}</span>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <Link to={revision.id}>
                      <Tag>
                        <code>{revision.id.slice(17)}</code>
                      </Tag>
                      {revision.title}
                    </Link>
                  </div>
                  {revision.comment && (
                    <span className="text-gray-400 text-sm">{revision.comment}</span>
                  )}
                </>
              )
            }
          />
          <Column
            title="修改者"
            dataIndex="author"
            render={(_, revision: ArticleRevisionListItem) => revision.author.nickname}
          />
          <Column
            title="修改时间"
            dataIndex="createdAt"
            render={(value) => new Date(value).toLocaleString()}
          />
          <Column
            title="反馈"
            dataIndex="id"
            render={(id, revision: ArticleRevisionListItem) => (
              <FeedbackSummary revision={revision} />
            )}
          />
          {/* <Column
            title="操作"
            dataIndex="id"
            render={() => <Button size="small">恢复到该版本</Button>}
          /> */}
        </Table>
      )}
    </div>
  );
}

export function ArticleRevisionDetail() {
  const { id: articleId, rid: revisionId, language } = useParams();

  const result = useArticleRevision(articleId!, language!, revisionId!);

  return (
    <QueryResult className="p-10" result={result}>
      {({ data: revision }) => (
        <>
          <div className="flex justify-center mb-1">
            <Breadcrumb className="grow">
              <Breadcrumb.Item>
                <Link to="../../../..">文章</Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Link to="../../..">{articleId}</Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>{LOCALES[language!]}</Breadcrumb.Item>
              <Breadcrumb.Item>
                <Link to="..">历史</Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item className="text-gray-300">{revisionId}</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <Title level={2}>{revision?.title}</Title>
          {revision && (
            <>
              {revision.contentSafeHTML && (
                <div
                  className="markdown-body"
                  dangerouslySetInnerHTML={{ __html: revision.contentSafeHTML }}
                />
              )}
            </>
          )}
        </>
      )}
    </QueryResult>
  );
}
