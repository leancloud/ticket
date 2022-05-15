import { forwardRef, useCallback, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { RefSelectProps } from 'antd/lib/select';

import { useTopics } from '@/api/topic';
import { useCategories, useCategoryTree } from '@/api/category';
import { useTicketForms } from '@/api/ticket-form';
import { GroupSelect } from '@/components/common';
import {
  Button,
  Divider,
  Form,
  Input,
  Select,
  SelectProps,
  TreeSelect,
  TreeSelectProps,
} from '@/components/antd';
import { JSONTextarea } from '@/App/Admin/components/JSONTextarea';
import { ArticleSelect } from '../Articles/ArticleSelect';

const { TextArea } = Input;

const FORM_ITEM_STYLE = { marginBottom: 16 };

const CategoryTreeSelect = forwardRef<RefSelectProps, TreeSelectProps<string | undefined>>(
  (props, ref) => {
    const { data: categories, isLoading } = useCategories();
    const categoryTree = useCategoryTree(categories);

    return (
      <TreeSelect
        {...props}
        ref={ref}
        showSearch
        treeNodeFilterProp="name"
        loading={isLoading}
        treeData={categoryTree}
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
    return data?.map((form) => ({
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
  const { control, handleSubmit } = useForm({ defaultValues: initData });

  const { data: categories, isLoading: loadingCategories } = useCategories();
  const categoryTree = useCategoryTree(categories);

  const findCategoryTreeNode = useCallback(
    (id: string) => {
      if (categoryTree) {
        const queue = [...categoryTree];
        while (queue.length) {
          const first = queue.shift()!;
          if (first.id === id) {
            return first;
          }
          first.children?.forEach((c) => queue.push(c));
        }
      }
      return undefined;
    },
    [categoryTree]
  );

  const validateParentId = useCallback(
    (parentId?: string) => {
      if (parentId && currentCategoryId) {
        const target = findCategoryTreeNode(currentCategoryId);
        if (target) {
          const queue = [target];
          while (queue.length) {
            const first = queue.shift()!;
            if (first.id === parentId) {
              return '父分类不能是分类自己或自己的子分类。';
            }
            first.children?.forEach((c) => queue.push(c));
          }
        }
      }
      return true;
    },
    [findCategoryTreeNode, currentCategoryId]
  );

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit as any)}>
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
        name="description"
        render={({ field }) => (
          <Form.Item label="描述" htmlFor="category_form_desc" style={FORM_ITEM_STYLE}>
            <TextArea {...field} id="category_form_desc" />
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
        rules={{ validate: validateParentId }}
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
              onChange={(value, ...params) => onChange(value ?? null, ...params)}
              allowClear
              id="category_form_parent_id"
            />
          </Form.Item>
        )}
      />

      <Divider orientation="left" orientationMargin={0}>
        表单 / 模板
      </Divider>
      <Controller
        control={control}
        name="formId"
        render={({ field, field: { onChange } }) => (
          <Form.Item label="关联工单表单" htmlFor="category_form_form_id" style={FORM_ITEM_STYLE}>
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
        name="template"
        render={({ field }) => (
          <Form.Item label="问题描述模板" htmlFor="category_form_template" style={FORM_ITEM_STYLE}>
            <TextArea {...field} id="category_form_template" rows={5} />
          </Form.Item>
        )}
      />

      <Divider orientation="left" orientationMargin={0}>
        知识库
      </Divider>
      <Controller
        control={control}
        name="noticeIds"
        render={({ field }) => (
          <Form.Item
            label="公告"
            htmlFor="category_form_notice_ids"
            help={
              <>
                <div>公告会在用户落地到该分类时展示在页面顶部，数量最大为三条。</div>
                <div>未发布的文章不会展示。</div>
              </>
            }
            style={FORM_ITEM_STYLE}
          >
            <ArticleSelect
              {...field}
              id="category_form_notice_ids"
              onChange={(value) => field.onChange(value.slice(0, 3))}
            />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="topicIds"
        render={({ field }) => (
          <Form.Item
            label="Topics"
            htmlFor="category_form_topic_ids"
            help="Topics 会在用户落地到该分类时展示"
            style={FORM_ITEM_STYLE}
          >
            <TopicSelect {...field} id="category_form_topic_ids" />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="articleIds"
        render={({ field }) => (
          <Form.Item
            label="常见问题"
            htmlFor="category_form_article_ids"
            help="新建工单时，选中该分类将展示的常见问题。"
            style={FORM_ITEM_STYLE}
          >
            <ArticleSelect {...field} id="category_form_article_ids" />
          </Form.Item>
        )}
      />

      <Divider orientation="left" orientationMargin={0}>
        自动化
      </Divider>
      <Controller
        control={control}
        name="groupId"
        render={({ field, field: { onChange } }) => (
          <Form.Item
            label="自动关联客服组"
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

      <Divider orientation="left" orientationMargin={0}>
        开发者选项
      </Divider>
      <Controller
        control={control}
        name="meta"
        render={({ field }) => (
          <Form.Item
            label="Meta"
            htmlFor="meta"
            help="面向开发者的扩展属性"
            style={FORM_ITEM_STYLE}
          >
            <JSONTextarea {...field} id="meta" />
          </Form.Item>
        )}
      />

      <div className="mt-6 flex">
        <div className="grow">
          <Button type="primary" htmlType="submit" disabled={loadingCategories} loading={loading}>
            保存
          </Button>
          <Link className="ml-2" to="..">
            <Button disabled={loading}>返回</Button>
          </Link>
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
