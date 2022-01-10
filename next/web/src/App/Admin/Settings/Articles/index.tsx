import { useState } from 'react';
import {
  Breadcrumb,
  Button,
  ButtonProps,
  Dropdown,
  Empty,
  Menu,
  message,
  Popover,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePage, usePageSize } from 'utils/usePage';
import {
  Article,
  createArticle,
  deleteArticle,
  updateArticle,
  UpdateArticleData,
  useArticle,
  useArticles,
  useRelatedCategories,
} from 'api/article';
import { useMutation, useQueryClient } from 'react-query';
import { EditArticleForm } from './EditArticleForm';
// We should move them to @component
import { CategoryPath, useGetCategoryPath } from '../../Tickets/TicketView/TicketList';
import { CategorySchema } from 'api/category';

const { Column } = Table;
const { Option } = Select;
const { Title } = Typography;

const PrivateQueryValue = {
  true: true,
  false: false,
  unset: undefined,
};

export function Articles() {
  const [filter, setFilter] = useState<'true' | 'false' | 'unset'>('unset');
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
      <div className="flex flex-row mb-4">
        <div className="grow">
          <Select value={filter} onChange={setFilter}>
            <Option value="unset">全部</Option>
            <Option value="true">未发布</Option>
            <Option value="false">已发布</Option>
          </Select>
        </div>
        <Link to="new">
          <Button type="primary" ghost>
            新增文章
          </Button>
        </Link>
      </div>

      {isLoading && <div className="h-80 my-40 text-center" children={<Spin />} />}

      {articles && (
        <Table
          dataSource={articles}
          rowKey="id"
          pagination={{
            pageSize,
            onShowSizeChange: (page, size) => {
              setPage(page);
              setPageSize(size);
            },
            current: page,
            onChange: setPage,
            total: totalCount,
          }}
        >
          <Column
            title="标题"
            dataIndex="title"
            render={(title, article: Article) => <Link to={article.id}>{title}</Link>}
          />
          <Column
            title="状态"
            dataIndex="private"
            render={(title, article: Article) => <ArticleStatus article={article} />}
          />
          <Column
            title="创建日期"
            dataIndex="createdAt"
            render={(value) => new Date(value).toLocaleString()}
          />
          <Column
            title="修改日期"
            dataIndex="updatedAt"
            render={(value) => new Date(value).toLocaleString()}
          />
        </Table>
      )}
    </div>
  );
}

const useMutateArticle = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateArticleData) => updateArticle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries('articles');
      queryClient.invalidateQueries(['article', id]);
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`更新失败：${error.message}`);
    },
  });
};

interface TogglePrivateButtonProps extends ButtonProps {
  article: Article;
}
function TogglePrivateButton({ article, ...props }: TogglePrivateButtonProps) {
  const { mutate, isLoading } = useMutateArticle(article.id);
  return (
    <Button
      {...props}
      disabled={isLoading}
      onClick={() => mutate({ ['private']: !article.private })}
    >
      {article.private ? '发布' : '撤销发布'}
    </Button>
  );
}

function ArticleStatus({ article }: { article: Article }) {
  return (
    <>
      <Tag color={article.private ? undefined : 'green'} className="scale-110">
        {article.private ? '未发布' : '已发布'}
      </Tag>
      <TogglePrivateButton article={article} className="scale-90" size="small" type="link" />
    </>
  );
}

export function NewArticle() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { mutate, isLoading } = useMutation({
    mutationFn: createArticle,
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries('articles');
      navigate('..');
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`创建失败：${error.message}`);
    },
  });

  return (
    <EditArticleForm
      initData={{
        title: '',
        content: '',
        private: false,
      }}
      submitting={isLoading}
      onSubmit={mutate}
      onCancel={() => navigate('..')}
    />
  );
}

export function EditArticle() {
  const { id } = useParams();
  const { data: article, isLoading } = useArticle(id!, {
    staleTime: 1000 * 60,
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate, isLoading: isUpdating } = useMutation({
    mutationFn: (data: UpdateArticleData) => updateArticle(id!, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries('articles');
      queryClient.invalidateQueries(['article', id]);
      navigate('..');
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`更新失败：${error.message}`);
    },
  });

  if (isLoading) {
    return <div className="h-80 my-40 text-center" children={<Spin />} />;
  }
  return (
    <EditArticleForm
      initData={article}
      submitting={isUpdating}
      onSubmit={mutate}
      onCancel={() => navigate('..')}
    />
  );
}

function CategoryList({ categories }: { categories: CategorySchema[] }) {
  const getCategoryPath = useGetCategoryPath();
  return (
    <>
      {categories.map((category) => (
        <CategoryPath path={getCategoryPath(category.id)} className="mr-1 inline-block" key={category.id} />
      ))}
    </>
  );
}

export function ArticleDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: article, isLoading } = useArticle(id!, {
    staleTime: 1000 * 60,
  });

  const queryClient = useQueryClient();
  const { mutate: deleteAtcl } = useMutation({
    mutationFn: deleteArticle,
    onSuccess: () => {
      message.success('已删除');
      navigate('../..');
      queryClient.invalidateQueries('articles');
      queryClient.invalidateQueries(['article', id]);
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`删除失败：${error.message}`);
    },
  });

  const { data: relatedCategories } = useRelatedCategories(id!);

  if (isLoading) {
    return <div className="h-80 my-40 text-center" children={<Spin />} />;
  }

  if (!article) {
    return <Empty description="没有找到该文章" />;
  }

  return (
    <div className="p-10">
      <div className="flex justify-center mb-1">
        <Breadcrumb className="grow">
          <Breadcrumb.Item>
            <Link to="../..">文章</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item className="text-gray-300">{article.id}</Breadcrumb.Item>
        </Breadcrumb>
        <div>
          <TogglePrivateButton size="small" article={article} />{' '}
          {article.private ? (
            <Dropdown.Button
              size="small"
              onClick={() => navigate('edit')}
              overlay={
                <Menu>
                  <Menu.Item key="1" danger onClick={() => deleteAtcl(id!)}>
                    删除
                  </Menu.Item>
                </Menu>
              }
            >
              编辑
            </Dropdown.Button>
          ) : (
            <Button size="small" onClick={() => navigate('edit')}>
              编辑
            </Button>
          )}
        </div>
      </div>
      <Title level={2}>{article.title}</Title>
      {!!relatedCategories?.length && (
        <div className="mb-4 p-4 bg-gray-50">
          正在使用该文章的分类： <CategoryList categories={relatedCategories} />
        </div>
      )}
      {article && (
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: article.contentSafeHTML }}
        />
      )}
      <div className=" mt-7">
        <span className="text-gray-400">
          创建于 {new Date(article.createdAt).toLocaleString()} 更新于{' '}
          {new Date(article.updatedAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
}