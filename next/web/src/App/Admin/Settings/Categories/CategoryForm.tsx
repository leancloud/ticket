import { forwardRef, useCallback, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { RefSelectProps } from 'antd/lib/select';

import { useArticles } from '@/api/article';
import { useCategories, useCategoryTree } from '@/api/category';
import { useTicketForms } from '@/api/ticket-form';
import { CategorySelect, GroupSelect } from '@/components/common';
import { Button, Form, Input, Select } from '@/components/antd';

const { TextArea } = Input;

const FORM_ITEM_STYLE = { marginBottom: 16 };

interface ArticleSelectProps {
  value?: string[];
  onChange: (value: string[]) => void;
}

const ArticleSelect = forwardRef<RefSelectProps, ArticleSelectProps>(({ value, onChange }, ref) => {
  const { data, isLoading } = useArticles();
  const options = useMemo(() => {
    return data?.map((article) => ({
      label: (article.private ? '[未发布] ' : '') + article.title,
      value: article.id,
    }));
  }, [data]);

  return (
    <Select
      ref={ref}
      className="w-full"
      loading={isLoading}
      mode="multiple"
      allowClear
      showArrow
      options={options}
      optionFilterProp="label"
      maxTagTextLength={12}
      value={value}
      onChange={onChange}
    />
  );
});

interface TicketFormSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
}

const TicketFormSelect = forwardRef<RefSelectProps, TicketFormSelectProps>(
  ({ value, onChange }, ref) => {
    const { data, isLoading } = useTicketForms();
    const options = useMemo(() => {
      return data?.map((form) => ({
        label: form.title,
        value: form.id,
      }));
    }, [data]);

    return (
      <Select
        ref={ref}
        className="w-full"
        loading={isLoading}
        options={options}
        showSearch
        allowClear
        optionFilterProp="label"
        value={value}
        onChange={onChange}
      />
    );
  }
);

export interface CategoryFormData {
  name: string;
  description?: string;
  parentId?: string;
  noticeIds?: string[];
  faqIds?: string[];
  groupId?: string;
  formId?: string;
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
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
            style={FORM_ITEM_STYLE}
          >
            <Input {...field} autoFocus />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <Form.Item label="描述" style={FORM_ITEM_STYLE}>
            <TextArea {...field} />
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
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
            style={FORM_ITEM_STYLE}
          >
            <CategorySelect {...field} categoryActive allowClear changeOnSelect />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="noticeIds"
        render={({ field }) => (
          <Form.Item
            label="公告"
            help={
              <>
                <div>公告会在用户落地到该分类时展示在页面顶部，数量最大为三条。</div>
                <div>未发布的文章不会展示。</div>
              </>
            }
            style={FORM_ITEM_STYLE}
          >
            <ArticleSelect {...field} onChange={(value) => field.onChange(value.slice(0, 3))} />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="faqIds"
        render={({ field }) => (
          <Form.Item
            label="常见问题"
            help="新建工单时，选中该分类将展示的常见问题。"
            style={FORM_ITEM_STYLE}
          >
            <ArticleSelect {...field} />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="groupId"
        render={({ field }) => (
          <Form.Item label="自动关联客服组" style={FORM_ITEM_STYLE}>
            <GroupSelect {...field} allowClear />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="formId"
        render={({ field }) => (
          <Form.Item label="关联工单表单" style={FORM_ITEM_STYLE}>
            <TicketFormSelect {...field} />
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
