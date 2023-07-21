import { forwardRef, useEffect, useMemo, ReactNode, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { RefSelectProps } from 'antd/lib/select';
import { useArticles, Article } from '@/api/article';
import { useTopics } from '@/api/topic';
import { useCategories, useCategoryTree, CategorySchema } from '@/api/category';
import { useTicketForms } from '@/api/ticket-form';
import { GroupSelect } from '@/components/common';
import { ArticleListFormItem } from '@/App/Admin/components/ArticleListFormItem';
import { SortableListFormItem } from '@/App/Admin/components/SortableListFormItem';
import { checkArticlePublished } from '@/App/Admin/Settings/Articles/utils';
import {
  Button,
  Checkbox,
  Divider,
  Tag,
  Empty,
  Alert,
  Form,
  Input,
  Select,
  SelectProps,
  TreeSelect,
  TreeSelectProps,
} from '@/components/antd';
import { findTreeNode } from './utils';
import { MetaField, MetaOptionsGroup } from '../../components/MetaField';
import { AiClassifyTest } from './AiClassifyTest';

type PreviewFAQ = Omit<Article, 'name'> & { title: string };
interface PreviewConfig {
  category: {
    name: string;
    isTicketEnabled: boolean;
    ticketDescription?: string;
  };
  articleId?: string;
  faqs?: PreviewFAQ[];
}

const { TextArea } = Input;

const FORM_ITEM_STYLE = { marginBottom: 16 };

const CategoryMetaOptions: MetaOptionsGroup<CategorySchema>[] = [
  {
    label: 'AI 分类',
    key: 'classify',
    children: [
      {
        key: 'enableAIClassify',
        label: '启用 AI 分类',
        type: 'boolean',
        predicate: (v) => !!v.alias,
      },
      {
        key: 'aiDescription',
        label: 'AI 分类描述',
        type: 'text',
        predicate: (v) => !v.alias || !!v.parentId,
        description:
          '描述的详细与否会影响 AI 帮助用户进行分类的准确度，为空时代表此分类不参与 AI 分类',
      },
      {
        key: 'previewAIClassify',
        type: 'component',
        component: <AiClassifyTest />,
        predicate: (v) => !!v.alias,
      },
    ],
  },
];

const CategoryTreeSelect = forwardRef<RefSelectProps, TreeSelectProps<string | undefined>>(
  (props, ref) => {
    return (
      <TreeSelect
        {...props}
        ref={ref}
        showSearch
        treeNodeFilterProp="name"
        fieldNames={{ label: 'name', value: 'id' }}
      />
    );
  }
);

const TopicSelect = forwardRef<RefSelectProps, SelectProps<string[]>>((props, ref) => {
  const { data, isLoading } = useTopics();
  const options = useMemo(() => {
    return data?.map((topic) => ({
      label: `${topic.name}(${topic.articleIds.length})`,
      value: topic.id,
    }));
  }, [data]);

  return (
    <Select
      {...props}
      ref={ref}
      className="w-full"
      loading={isLoading}
      mode="multiple"
      allowClear
      showArrow
      options={options}
      optionFilterProp="label"
      maxTagTextLength={12}
    />
  );
});

const TicketFormSelect = forwardRef<RefSelectProps, SelectProps<string>>((props, ref) => {
  const { data, isLoading } = useTicketForms({ pageSize: 1000 });

  const options = useMemo(() => {
    return data?.items.map((form) => ({
      label: form.title,
      value: form.id,
    }));
  }, [data]);

  return (
    <Select
      {...props}
      ref={ref}
      className="w-full"
      loading={isLoading}
      options={options}
      showSearch
      allowClear
      optionFilterProp="label"
    />
  );
});

export interface CategoryFormData {
  alias?: string;
  name: string;
  description?: string;
  parentId?: string;
  noticeIds?: string[];
  articleIds?: string[];
  topicIds?: string[];
  groupId?: string;
  formId?: string;
  template?: string;
  meta?: Record<string, any>;
  hidden?: boolean;
  articleId?: string | null;
  isTicketEnabled: boolean;
  ticketDescription?: string;
}

export interface CategoryFormProps {
  currentCategoryId?: string;
  categoryActive?: boolean;
  onChangeCategoryActive?: (active: boolean) => void;
  initData?: Partial<CategoryFormData>;
  loading?: boolean;
  onSubmit: (data: CategoryFormData) => void;
}

export function CategoryForm({
  currentCategoryId,
  categoryActive,
  onChangeCategoryActive,
  initData,
  loading,
  onSubmit,
}: CategoryFormProps) {
  const { control, handleSubmit, setValue, getValues } = useForm({
    defaultValues: initData,
  });
  const [solutionExpanded, setSolutionExpanded] = useState(false);
  const [relatedArticlesExpanded, setRelatedArticlesExpanded] = useState(false);
  const [ticketExpanded, setTicketExpanded] = useState(false);

  const { data: categories, isLoading: loadingCategories } = useCategories();

  const activeCategories = useMemo(() => {
    return categories?.filter((c) => c.active);
  }, [categories]);

  const categoryTree = useCategoryTree(activeCategories);

  const isProduct = !!initData?.alias;

  const hasSubCategory = useMemo(() => {
    if (!currentCategoryId) {
      return false;
    }
    return !!activeCategories?.find((item) => item.parentId === currentCategoryId);
  }, [currentCategoryId, activeCategories]);

  const { data: articles, isLoading: loadingArticles } = useArticles();
  const { data: topics, isLoading: loadingTopics } = useTopics();
  const articlesOptions = useMemo(() => {
    return articles?.map((article) => ({
      label: article.name,
      value: article.id,
    }));
  }, [articles]);

  useEffect(() => {
    if (initData?.articleId) {
      setSolutionExpanded(true);
    }
    if (initData?.articleIds?.length) {
      setRelatedArticlesExpanded(true);
    }
    setTicketExpanded(!!initData?.isTicketEnabled);
  }, [initData]);

  useEffect(() => {
    if (categoryTree && currentCategoryId) {
      const current = findTreeNode(categoryTree, (node) => node.id === currentCategoryId);
      if (current) {
        // 摘掉当前节点
        const container = current.parent?.children ?? categoryTree;
        const index = container.findIndex((node) => node.id === current.id);
        container.splice(index, 1);
      }
    }
  }, [categoryTree, currentCategoryId]);

  const preview = () => {
    if (!articles) {
      return;
    }
    const { articleId, articleIds, isTicketEnabled, name, ticketDescription } = getValues();

    const config: PreviewConfig = {
      category: {
        name: name || '',
        isTicketEnabled: isTicketEnabled || false,
        ticketDescription: ticketDescription,
      },
      articleId: articleId || undefined,
    };

    if (articleIds?.length) {
      config.faqs = articles
        .filter((article) => articleIds.includes(article.id))
        .filter((article) => checkArticlePublished(article))
        .map((article) => ({ ...article, title: article.name }));
    }

    const configString = JSON.stringify(config);
    const id = getCategoryRootId(currentCategoryId, categories);

    window.open(
      `/in-app/v1/products/${id}/categories/preview?nav=0&configs=${configString}`,
      'self',
      'width=500,height=600'
    );
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit as any)}>
      <div className="text-[16px] mb-4 font-semibold">展示配置</div>
      <Controller
        control={control}
        name="name"
        rules={{ required: '请填写此字段' }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            required
            label="名称"
            htmlFor="category_form_name"
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
            style={FORM_ITEM_STYLE}
          >
            <Input {...field} autoFocus id="category_form_name" />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="alias"
        render={({ field }) => (
          <Form.Item label="资源 ID（别名）" htmlFor="category_form_alias" style={FORM_ITEM_STYLE}>
            <Input {...field} id="category_form_alias" />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="parentId"
        render={({ field, field: { onChange }, fieldState: { error } }) => (
          <Form.Item
            label="父分类"
            htmlFor="category_form_parent_id"
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
            style={FORM_ITEM_STYLE}
          >
            <CategoryTreeSelect
              {...field}
              allowClear
              id="category_form_parent_id"
              treeData={categoryTree}
              loading={loadingCategories}
              onChange={(value, ...params) => onChange(value ?? null, ...params)}
            />
          </Form.Item>
        )}
      />

      <Form.Item>
        <Controller
          control={control}
          name="hidden"
          render={({ field: { value, onChange } }) => (
            <Checkbox checked={value} onChange={onChange} children="用户提单时隐藏" />
          )}
        />
      </Form.Item>

      <Divider />

      {isProduct && (
        <div>
          <div className="text-[18px] mb-4 font-semibold">内容</div>
          <Controller
            control={control}
            name="noticeIds"
            render={({ field }) => (
              <Form.Item htmlFor="category_form_notice_ids" style={FORM_ITEM_STYLE}>
                <div className="font-semibold mb-2">公告</div>
                <div className="text-[rgba(0,0,0,0.45)] mb-4">
                  <div>公告会在游戏落地页顶部轮播展示，数量最大为三条。未发布的文章不会展示。</div>
                </div>
                <ArticleListFormItem
                  articles={articles}
                  value={field.value}
                  onChange={field.onChange}
                  loading={loadingArticles}
                  maxCount={3}
                  modalTitle="编辑公告"
                />
              </Form.Item>
            )}
          />
          <Controller
            control={control}
            name="topicIds"
            render={({ field }) => (
              <Form.Item htmlFor="category_form_topic_ids" style={FORM_ITEM_STYLE}>
                <div className="font-semibold mb-2">精选主题</div>
                <div className="text-[rgba(0,0,0,0.45)] mb-4">
                  <div>选择的主题会以 Tab 形式展示在游戏落地页。可以用来承载常见问题等需求。</div>
                  <div>精选主题是可选的。如果不设置精选主题，游戏落地页会展示分类列表。</div>
                </div>
                <SortableListFormItem
                  items={topics}
                  itemKey={(topic) => topic.id}
                  value={field.value}
                  onChange={field.onChange}
                  loading={loadingTopics}
                  modalTitle="编辑精选主题"
                  renderListItem={(topic) => <Tag className="truncate">{topic.name}</Tag>}
                  renderTransferItem={(topic) => topic.name}
                  emptyElement={
                    <Empty description="暂无主题">
                      <Link to="/admin/knowledge-base/topics/new">
                        <Button type="primary">创建</Button>
                      </Link>
                    </Empty>
                  }
                />
              </Form.Item>
            )}
          />
        </div>
      )}

      {isProduct && (
        <>
          <Divider />
          <div className="text-[18px] mb-4 font-semibold">其他</div>
          <Controller
            control={control}
            name="ticketDescription"
            render={({ field }) => (
              <Form.Item
                label="提交说明"
                htmlFor="category_form_ticket_description"
                style={FORM_ITEM_STYLE}
                extra={
                  <>
                    <div>用户提交工单操作的提示信息，如可以配置为：「预计回复时间：4小时」。</div>
                    <div>对当前产品下所有的分类生效。</div>
                  </>
                }
              >
                <Input id={'category_form_ticket_description'} {...field} disabled={loading} />
              </Form.Item>
            )}
          />
        </>
      )}

      {!isProduct && hasSubCategory && (
        <div>
          <div className="text-[16px] mb-4 font-semibold">支持选项</div>
          <Alert message="仅在无子分类时展示" type="info" showIcon style={{ marginBottom: 24 }} />
        </div>
      )}

      {!hasSubCategory && (
        <div>
          <div className="text-[16px] mb-4 font-semibold">支持选项</div>
          <FormGroup
            title="解决方案"
            description="展示一篇知识库文章的内容"
            disabled={loading}
            expanded={solutionExpanded}
            onChange={(expanded) => {
              setSolutionExpanded(expanded);
              if (!expanded) {
                setValue('articleId', null);
              }
            }}
          >
            <Controller
              control={control}
              name="articleId"
              rules={{ required: '请选择文章' }}
              render={({ field }) => (
                <Form.Item
                  required
                  label="文章"
                  htmlFor="category_form_article_id"
                  style={FORM_ITEM_STYLE}
                >
                  <Select {...field} options={articlesOptions} id="category_form_article_id" />
                </Form.Item>
              )}
            />
          </FormGroup>

          <FormGroup
            title="相关文章"
            description="展示多篇相关知识库文章的链接"
            expanded={relatedArticlesExpanded}
            onChange={(expanded) => {
              setRelatedArticlesExpanded(expanded);
              if (!expanded) {
                setValue('articleIds', []);
              }
            }}
          >
            <Controller
              control={control}
              name="articleIds"
              render={({ field }) => (
                <Form.Item htmlFor="category_form_article_ids" style={FORM_ITEM_STYLE}>
                  <ArticleListFormItem
                    articles={articles}
                    value={field.value}
                    onChange={field.onChange}
                    modalTitle="编辑相关文章"
                    loading={loadingArticles}
                  />
                </Form.Item>
              )}
            />
          </FormGroup>

          <FormGroup
            title="提交工单"
            description="展示提交工单的入口"
            expanded={ticketExpanded}
            onChange={(expanded) => {
              setTicketExpanded(expanded);
              setValue('isTicketEnabled', expanded);
            }}
          >
            <Controller
              control={control}
              name="formId"
              rules={{ required: '请选择表单' }}
              render={({ field, field: { onChange } }) => (
                <Form.Item
                  required
                  label={'表单'}
                  htmlFor="category_form_form_id"
                  style={FORM_ITEM_STYLE}
                >
                  <TicketFormSelect
                    {...field}
                    onChange={(value, ...params) => onChange(value ?? null, ...params)}
                    id="category_form_form_id"
                  />
                </Form.Item>
              )}
            />

            <Controller
              control={control}
              name="ticketDescription"
              render={({ field }) => (
                <Form.Item
                  label="提交说明"
                  htmlFor="category_form_ticket_description"
                  style={FORM_ITEM_STYLE}
                  extra={
                    <>
                      <div>用户提交工单操作的提示信息，如可以配置为：「预计回复时间：4小时」。</div>
                      <div>会覆盖产品层级的设置。</div>
                    </>
                  }
                >
                  <Input id={'category_form_ticket_description'} {...field} disabled={loading} />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="groupId"
              render={({ field, field: { onChange } }) => (
                <Form.Item
                  label="自动分配给客服组"
                  htmlFor="category_form_group_id"
                  style={FORM_ITEM_STYLE}
                >
                  <GroupSelect
                    {...field}
                    onChange={(value, ...params) => onChange(value ?? null, ...params)}
                    allowClear
                    id="category_form_group_id"
                  />
                </Form.Item>
              )}
            />
            {initData?.template && (
              <Controller
                control={control}
                name="template"
                render={({ field }) => (
                  <Form.Item
                    label="问题描述模板"
                    htmlFor="category_form_template"
                    style={FORM_ITEM_STYLE}
                  >
                    <TextArea {...field} id="category_form_template" rows={5} />
                  </Form.Item>
                )}
              />
            )}
          </FormGroup>
        </div>
      )}

      <Divider />
      <div className="text-[16px] mb-4 font-semibold">开发者选项</div>
      <Controller
        control={control}
        name="meta"
        render={({ field: { ref, ...rest } }) => (
          console.log(getValues()),
          (<MetaField {...rest} options={CategoryMetaOptions} record={getValues()} />)
        )}
      />

      <div className="pt-4 flex sticky bg-white bottom-0 pb-10 mb-[-2.5rem]">
        <div className="grow space-x-2">
          <Button type="primary" htmlType="submit" disabled={loadingCategories} loading={loading}>
            保存
          </Button>
          {!hasSubCategory && (
            <Button disabled={loading} onClick={preview}>
              预览
            </Button>
          )}
        </div>
        {categoryActive === true && (
          <Button danger disabled={loading} onClick={() => onChangeCategoryActive?.(false)}>
            停用
          </Button>
        )}
        {categoryActive === false && (
          <Button disabled={loading} onClick={() => onChangeCategoryActive?.(true)}>
            启用
          </Button>
        )}
      </div>
    </Form>
  );
}

interface FormGroupProps {
  disabled?: boolean;
  readonly?: boolean;
  expanded: boolean;
  onChange: (expand: boolean) => void;
  title: string;
  description: string;
  children?: ReactNode;
}

function FormGroup({
  disabled,
  readonly,
  expanded,
  onChange,
  title,
  description,
  children,
}: FormGroupProps) {
  return (
    <div className="mb-6">
      <Checkbox
        disabled={disabled || readonly}
        checked={disabled ? false : expanded}
        onChange={(e) => onChange(e.target.checked)}
      >
        {title}
      </Checkbox>
      <div className="ml-6 mt-1">
        <p className="text-[rgba(0,0,0,0.45)]">{description}</p>
        {!disabled && expanded && children}
      </div>
    </div>
  );
}

function getCategoryRootId(id?: string, categories?: CategorySchema[]) {
  if (!categories?.length || !id) {
    return;
  }
  let current = categories.find((item) => item.id === id);
  while (current && current.parentId) {
    current = categories.find((item) => item.id === current?.parentId);
  }

  return current?.id;
}
