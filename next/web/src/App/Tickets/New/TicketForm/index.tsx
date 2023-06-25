import { useEffect, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { SiMarkdown } from 'react-icons/si';
import { last } from 'lodash-es';
import { useToggle } from 'react-use';

import { useCurrentUserIsCustomerService, ENABLE_LEANCLOUD_INTEGRATION } from '@/leancloud';
import { CategorySchema, useCategories, useCategoryFaqs } from '@/api/category';
import { useOrganizations } from '@/api/organization';
import { useTicketFormItems } from '@/api/ticket-form';
import { Button, Collapse, Form, Input, Radio, RadioChangeEvent } from '@/components/antd';
import { CategorySelect, Retry, UserSelect } from '@/components/common';
import style from './index.module.css';
import { OrganizationSelect } from './OrganizationSelect';
import { LeanCloudAppSelect } from './LeanCloudAppSelect';
import { Input as MyInput } from './Fields/Input';
import { Upload } from './Fields/Upload';
import { FormItems } from './FormItems';
import { RecentTickets } from '@/components/common/RecentTickets';

const { Panel } = Collapse;

const presetFieldIds = ['title', 'description', 'details', 'attachments'];

function openLinkInNewTab(el: HTMLElement | null) {
  el?.querySelectorAll('a').forEach((a) => (a.target = '_blank'));
}

interface FaqsItemProps {
  categoryId: string;
}

function FaqsItem({ categoryId }: FaqsItemProps) {
  const { data: faqs } = useCategoryFaqs(categoryId, {
    staleTime: 1000 * 60,
  });

  if (!faqs || faqs.length === 0) {
    return null;
  }

  return (
    <Form.Item label="常见问题">
      <Collapse>
        {faqs.map(({ id, title, contentSafeHTML }) => (
          <Panel key={id} header={title}>
            <div
              ref={openLinkInNewTab}
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: contentSafeHTML }}
            />
          </Panel>
        ))}
      </Collapse>
    </Form.Item>
  );
}

interface RawTicketData {
  authorId?: string;
  organizationId?: string;
  title: string;
  appId?: string;
  categoryId?: string;
  fileIds?: string[];
  content: string;
  [key: string]: any;
}

export interface TicketData {
  authorId?: string;
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
  const isCustomerSerivce = useCurrentUserIsCustomerService();
  const [asAttorney, setAsAttorney] = useState(isCustomerSerivce);

  const orgs = useOrganizations();

  const categoryId = useWatch({ control, name: 'categoryId' });

  const { data: categories } = useCategories({ active: true });

  const currentCategory = useMemo(() => {
    if (categories && categoryId) {
      return categories.find((c) => c.id === categoryId);
    }
  }, [categories, categoryId]);

  const { data: formItems, isLoading: loadingFormItems } = useTicketFormItems(
    currentCategory?.formId,
    {
      staleTime: 1000 * 60 * 5,
      enabled: currentCategory?.formId !== undefined,
    }
  );

  const filteredFormItems = useMemo(() => {
    return formItems?.filter((item) => {
      if (item.type === 'field') {
        return !presetFieldIds.includes(item.data.id);
      }
      return true;
    });
  }, [formItems]);

  const overwriteContent = (newContent: string) => {
    const { content } = getValues();
    if (content && !confirm('是否使用所选分类的模板覆盖当前描述')) {
      return;
    }
    setValue('content', newContent);
  };

  const handleChangeCategory = (categoryPath?: CategorySchema[]) => {
    if (categoryPath?.length) {
      const category = last(categoryPath)!;
      if (category.template) {
        overwriteContent(category.template);
      }
    }
  };

  const handleSubmit = methods.handleSubmit((data) => {
    const {
      authorId,
      organizationId,
      title,
      appId,
      categoryId,
      fileIds,
      content,
      ...customFields
    } = data;
    onSubmit({
      authorId,
      organizationId,
      title,
      appId,
      fileIds,
      content,
      customFields,
      categoryId: categoryId!,
    });
  });

  useEffect(() => {
    const ALGOLIA_API_KEY = import.meta.env.VITE_ALGOLIA_API_KEY;
    if (ALGOLIA_API_KEY) {
      docsearch({
        apiKey: ALGOLIA_API_KEY,
        indexName: 'leancloud',
        inputSelector: '#ticket_title',
        debug: false,
      });
    }
  }, []);

  const [recentTicketCollapsed, toggleRecentTickets] = useToggle(false);

  const organizationSelect =
    orgs.data && orgs.data.length > 0 ? (
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
    ) : null;

  return (
    <div className="p-2">
      <FormProvider {...methods}>
        <Form className={style.ticketForm} layout="vertical" onSubmitCapture={handleSubmit}>
          {isCustomerSerivce ? (
            <div className="px-4 pt-4 pb-[0.1px] mb-4 bg-gray-100">
              <Form.Item>
                <Radio.Group
                  onChange={(e: RadioChangeEvent) => setAsAttorney(e.target.value)}
                  value={asAttorney}
                >
                  <Radio value={false}>本人提单</Radio>
                  <Radio value={true}>代用户提单</Radio>
                </Radio.Group>
              </Form.Item>
              {asAttorney ? (
                <Controller
                  name="authorId"
                  render={({ field, fieldState: { error } }) => (
                    <>
                      <Form.Item
                        required
                        label="用户"
                        htmlFor="ticket_author"
                        help={error?.message}
                      >
                        <UserSelect
                          {...field}
                          id="ticket_author"
                          allowClear
                          className="w-full"
                          onChange={(id) => field.onChange({ target: { value: id } })}
                        />
                      </Form.Item>
                      <Form.Item
                        label={
                          <>
                            最近工单{' '}
                            <Button type="link" onClick={toggleRecentTickets}>
                              {recentTicketCollapsed ? '展开' : '收起'}
                            </Button>
                          </>
                        }
                      >
                        {!recentTicketCollapsed &&
                          (field.value ? (
                            <RecentTickets userId={field.value} />
                          ) : (
                            <>请先选择一个用户</>
                          ))}
                      </Form.Item>
                    </>
                  )}
                />
              ) : (
                organizationSelect
              )}
            </div>
          ) : (
            organizationSelect
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
                  followHidden={!isCustomerSerivce}
                  onChange={(categoryId, categoryPath) => {
                    field.onChange(categoryId);
                    handleChangeCategory(categoryPath);
                  }}
                />
              </Form.Item>
            )}
          />
          {categoryId && <FaqsItem categoryId={categoryId} />}
          {filteredFormItems && filteredFormItems.length > 0 && (
            <FormItems items={filteredFormItems} />
          )}
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
              loading={loadingFormItems || loading}
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
