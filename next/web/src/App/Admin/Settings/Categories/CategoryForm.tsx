import { forwardRef, useCallback, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { RefSelectProps } from 'antd/lib/select';

import { useArticles } from '@/api/article';
import { useCategories, useCategoryTree } from '@/api/category';
import { useTicketForms } from '@/api/ticket-form';
import { GroupSelect } from '@/components/common';
import {
  Button,
  Form,
  Input,
  Select,
  SelectProps,
  TreeSelect,
  TreeSelectProps,
} from '@/components/antd';

const { TextArea } = Input;

const FORM_ITEM_STYLE = { marginBottom: 16 };

const CategoryTreeSelect = forwardRef<RefSelectProps, TreeSelectProps<string>>((props, ref) => {
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
});

const ArticleSelect = forwardRef<RefSelectProps, SelectProps<string[]>>((props, ref) => {
  const { data, isLoading } = useArticles();
  const options = useMemo(() => {
    return data?.map((article) => ({
      label: (article.private ? '[未发布] ' : '') + article.title,
      value: article.id,
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
  const { data, isLoading } = useTicketForms();
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
  name: string;
  description?: string;
  parentId?: string;
  noticeIds?: string[];
  articleIds?: string[];
  groupId?: string;
  formId?: string;
  template?: string;
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
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
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
        name="parentId"
        rules={{ validate: validateParentId }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            label="父分类"
            htmlFor="category_form_parent_id"
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
            style={FORM_ITEM_STYLE}
          >
            <CategoryTreeSelect {...field} allowClear id="category_form_parent_id" />
          </Form.Item>
        )}
      />

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

      <Controller
        control={control}
        name="groupId"
        render={({ field }) => (
          <Form.Item
            label="自动关联客服组"
            htmlFor="category_form_group_id"
            style={FORM_ITEM_STYLE}
          >
            <GroupSelect {...field} allowClear id="category_form_group_id" />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="formId"
        render={({ field }) => (
          <Form.Item label="关联工单表单" htmlFor="category_form_form_id" style={FORM_ITEM_STYLE}>
            <TicketFormSelect {...field} id="category_form_form_id" />
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
