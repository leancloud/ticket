import { forwardRef, useCallback, useMemo, useState } from 'react';
import { useQueries } from 'react-query';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { CascaderRef } from 'antd/lib/cascader';
import { SiMarkdown } from 'react-icons/si';
import { compact, last, uniqBy } from 'lodash-es';

import { ENABLE_LEANCLOUD_INTEGRATION } from '@/leancloud';
import { useArticles } from '@/api/article';
import {
  CategorySchema,
  fetchCategoryFaqs,
  useCategoryFields,
  useCategoryTree,
} from '@/api/category';
import { useOrganizations } from '@/api/organization';
import { Alert, Button, Cascader, CascaderProps, Collapse, Form, Input } from '@/components/antd';
import style from './index.module.css';
import { OrganizationSelect } from './OrganizationSelect';
import { LeanCloudAppSelect } from './LeanCloudAppSelect';
import { Input as MyInput } from './Fields/Input';
import { Upload } from './Fields/Upload';
import { CustomFields } from './CustomFields';

const { Panel } = Collapse;

const presetFieldIds = ['title', 'description'];

interface RetryProps {
  message?: string;
  error: Error;
  onRetry: () => void;
}

function Retry({ message = '获取数据失败', error, onRetry }: RetryProps) {
  return (
    <div className="mb-4">
      <Alert
        showIcon
        type="error"
        message={message}
        description={error.message}
        action={
          <Button size="small" danger onClick={onRetry}>
            重试
          </Button>
        }
      />
    </div>
  );
}

function useCategoriesFaqs(categoryIds: string[]) {
  const results = useQueries(
    categoryIds.map((id) => ({
      queryKey: ['categoryFaqs', id],
      queryFn: () => fetchCategoryFaqs(id),
      staleTime: 1000 * 60 * 5,
    }))
  );

  const data = useMemo(() => {
    const faqs = compact(results.map((result) => result.data)).flat();
    return uniqBy(faqs, 'id');
  }, [results]);

  const errors = useMemo(() => results.map((result) => result.error), [results]);

  const retry = useCallback(() => {
    results.forEach((result) => {
      if (result.error) {
        result.refetch();
      }
    });
  }, [results]);

  return {
    data,
    error: errors[0] as Error | undefined,
    retry,
  };
}

function FaqsItem({ ids }: { ids: string[] }) {
  const { data, error, refetch } = useArticles({
    id: ids,
    private: false,
    pageSize: ids.length,
    queryOptions: {
      staleTime: Infinity,
    },
  });

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <Form.Item label="常见问题">
      {error ? (
        <Retry error={error} onRetry={refetch} />
      ) : (
        <Collapse>
          {data.map(({ id, title, contentSafeHTML }) => (
            <Panel key={id} header={title}>
              <div
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: contentSafeHTML }}
              />
            </Panel>
          ))}
        </Collapse>
      )}
    </Form.Item>
  );
}

interface CategorySelectProps extends Omit<CascaderProps<string[]>, 'value' | 'onChange'> {
  value?: string[];
  onChange: (idPath?: string[], categoryPath?: CategorySchema[]) => void;
}

const CategorySelect = forwardRef<CascaderRef, CategorySelectProps>((props, ref) => {
  const { data, isLoading, error, refetch } = useCategoryTree({ active: true });

  if (error) {
    return <Retry error={error} onRetry={refetch} />;
  }

  return (
    <Cascader
      {...(props as any)}
      ref={ref}
      loading={isLoading}
      fieldNames={{ label: 'name', value: 'id' }}
      options={data as any}
    />
  );
});

interface RawTicketData {
  organizationId?: string;
  title: string;
  appId?: string;
  categoryPath: string[];
  fileIds?: string[];
  content: string;
  [key: string]: any;
}

export interface TicketData {
  organizationId?: string;
  title: string;
  appId?: string;
  categoryId: string;
  fileIds?: string[];
  content: string;
  customFields: Record<string, unknown>;
}

export interface TicketFormProps {
  loading?: boolean;
  disabled?: boolean;
  onSubmit: (data: TicketData) => void;
}

export function TicketForm({ loading, disabled, onSubmit }: TicketFormProps) {
  const methods = useForm<RawTicketData>({ shouldUnregister: true });
  const { control, getValues, setValue } = methods;
  const orgs = useOrganizations();

  const categoryPath = useWatch({ control, name: 'categoryPath' });
  const categoryId = useMemo(() => last(categoryPath), [categoryPath]);

  const { data: fields, isLoading: loadingFields } = useCategoryFields(categoryId!, {
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5,
    select: (fields) => fields.filter((f) => !presetFieldIds.includes(f.id)),
  });

  const overwriteContent = useCallback(
    (newContent: string) => {
      const { content } = getValues();
      if (content && !confirm('是否使用所选分类的模板覆盖当前描述')) {
        return;
      }
      setValue('content', newContent);
    },
    [getValues, setValue]
  );

  const [articleIds, setArticleIds] = useState<string[]>();

  const handleChangeCategory = useCallback(
    (categoryPath?: CategorySchema[]) => {
      setArticleIds(categoryPath?.map((c) => c.articleIds || []).flat());
      if (categoryPath?.length) {
        const category = last(categoryPath)!;
        if (category.template) {
          overwriteContent(category.template);
        }
      }
    },
    [overwriteContent]
  );

  const handleSubmit = methods.handleSubmit((data) => {
    const { organizationId, title, appId, categoryPath, fileIds, content, ...customFields } = data;
    onSubmit({
      organizationId,
      title,
      appId,
      fileIds,
      content,
      customFields,
      categoryId: last(categoryPath)!,
    });
  });

  return (
    <div className="p-2">
      <FormProvider {...methods}>
        <Form className={style.ticketForm} layout="vertical" onSubmitCapture={handleSubmit}>
          {orgs.data && orgs.data.length > 0 && (
            <Form.Item label="所属" htmlFor="ticket_org">
              {orgs.error ? (
                <Retry message="获取组织失败" error={orgs.error} onRetry={orgs.refetch} />
              ) : (
                <Controller
                  name="organizationId"
                  render={({ field }) => (
                    <OrganizationSelect
                      {...field}
                      id="ticket_org"
                      options={orgs.data}
                      loading={orgs.isLoading}
                    />
                  )}
                />
              )}
            </Form.Item>
          )}

          <MyInput name="title" label="标题" required />

          {ENABLE_LEANCLOUD_INTEGRATION && (
            <Form.Item
              label="相关应用"
              htmlFor="ticket_app"
              tooltip={{
                title: '如需显示其他节点应用，请到帐号设置页面关联帐号',
                placement: 'right',
              }}
            >
              <Controller
                name="appId"
                render={({ field }) => <LeanCloudAppSelect {...field} id="ticket_app" />}
              />
            </Form.Item>
          )}

          <Controller
            name="categoryPath"
            rules={{ required: '请填写此字段' }}
            render={({ field, fieldState: { error } }) => (
              <Form.Item
                required
                label="分类"
                htmlFor="ticket_category"
                validateStatus={error ? 'error' : undefined}
                help={error?.message}
              >
                <CategorySelect
                  {...field}
                  id="ticket_category"
                  onChange={(idPath, categoryPath) => {
                    field.onChange(idPath);
                    handleChangeCategory(categoryPath);
                  }}
                />
              </Form.Item>
            )}
          />

          {articleIds && articleIds.length > 0 && <FaqsItem ids={articleIds} />}

          {fields && fields.length > 0 && <CustomFields fields={fields} />}

          <Controller
            name="content"
            rules={{ required: '请填写此字段' }}
            render={({ field, fieldState: { error } }) => (
              <Form.Item
                label="描述"
                htmlFor="ticket_content"
                validateStatus={error ? 'error' : undefined}
                help={error?.message}
                tooltip={{
                  icon: <SiMarkdown style={{ width: 18, height: 18 }} />,
                  title: '支持 Markdown 语法',
                  placement: 'right',
                }}
              >
                <Input.TextArea {...field} id="ticket_content" rows={8} />
              </Form.Item>
            )}
          />

          <Upload label="附件" name="fileIds" multiple />

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loadingFields || loading}
              disabled={disabled}
            >
              提交
            </Button>
          </Form.Item>
        </Form>
      </FormProvider>
    </div>
  );
}
