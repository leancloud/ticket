import { useCallback, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { SiMarkdown } from 'react-icons/si';
import { compact, keyBy, last, uniq } from 'lodash-es';

import { ENABLE_LEANCLOUD_INTEGRATION } from '@/leancloud';
import { useArticles } from '@/api/article';
import { CategorySchema, useCategoryFields } from '@/api/category';
import { useOrganizations } from '@/api/organization';
import { Button, Collapse, Form, Input } from '@/components/antd';
import { CategorySelect, Retry } from '@/components/common';
import style from './index.module.css';
import { OrganizationSelect } from './OrganizationSelect';
import { LeanCloudAppSelect } from './LeanCloudAppSelect';
import { Input as MyInput } from './Fields/Input';
import { Upload } from './Fields/Upload';
import { CustomFields } from './CustomFields';

const { Panel } = Collapse;

const presetFieldIds = ['title', 'description'];

function openLinkInNewTab(el: HTMLElement | null) {
  el?.querySelectorAll('a').forEach((a) => (a.target = '_blank'));
}

function FaqsItem({ ids }: { ids: string[] }) {
  const { data: articles, error, refetch } = useArticles({
    id: ids,
    private: false,
    pageSize: ids.length,
    queryOptions: {
      staleTime: Infinity,
    },
  });

  const articleMap = useMemo(() => keyBy(articles, 'id'), [articles]);

  const sortedArticles = useMemo(() => {
    return compact(ids.map((id) => articleMap[id]));
  }, [ids, articleMap]);

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <Form.Item label="常见问题">
      {error ? (
        <Retry error={error} onRetry={refetch} />
      ) : (
        <Collapse>
          {sortedArticles.map(({ id, title, contentSafeHTML }) => (
            <Panel key={id} header={title}>
              <div
                ref={openLinkInNewTab}
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

interface RawTicketData {
  organizationId?: string;
  title: string;
  appId?: string;
  categoryId?: string;
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

  const categoryId = useWatch({ control, name: 'categoryId' });

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
      setArticleIds(undefined);
      if (categoryPath?.length) {
        const category = last(categoryPath)!;
        if (category.template) {
          overwriteContent(category.template);
        }
        setArticleIds(
          uniq(
            categoryPath
              .slice()
              .reverse()
              .map((c) => c.articleIds || [])
              .flat()
          )
        );
      }
    },
    [overwriteContent]
  );

  const handleSubmit = methods.handleSubmit((data) => {
    const { organizationId, title, appId, categoryId, fileIds, content, ...customFields } = data;
    onSubmit({
      organizationId,
      title,
      appId,
      fileIds,
      content,
      customFields,
      categoryId: categoryId!,
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
            name="categoryId"
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
                  categoryActive
                  onChange={(categoryId, categoryPath) => {
                    field.onChange(categoryId);
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
