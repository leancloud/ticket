import { useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { AiFillExclamationCircle, AiOutlineApi } from 'react-icons/ai';
import moment from 'moment';
import { difference, isEmpty, keyBy, partition } from 'lodash-es';
import { DefaultOptionType } from 'antd/lib/select';
import { ErrorBoundary } from 'react-error-boundary';

import {
  Button,
  Col,
  Descriptions,
  Divider,
  PageHeader,
  Row,
  Select,
  Skeleton,
  Spin,
  Tooltip,
} from '@/components/antd';
import { UserLabel } from '@/App/Admin/components';
import { useGroup, useGroups } from '@/api/group';
import { useCustomerServices } from '@/api/customer-service';
import { useCollaborators } from '@/api/collaborator';
import { useTagMetadatas } from '@/api/tag-metadata';
import {
  useAssociatedTickets,
  useCreateReply,
  useDisassociateTickets,
  useOperateTicket,
  useTicketFieldValues,
  useUpdateTicketFieldValues,
} from '@/api/ticket';
import { useCategory } from '@/api/category';
import { useTicketForm } from '@/api/ticket-form';
import { UserSchema } from '@/api/user';
import { getMetadataRenderer } from '@/config/config';
import { ENABLE_LEANCLOUD_INTEGRATION, useCurrentUser } from '@/leancloud';
import { TicketLink } from '@/App/Admin/components/TicketLink';
import { TicketStatus } from '@/App/Admin/components/TicketStatus';
import { Timeline } from './Timeline';
import { TagData, TagForm } from './TagForm';
import { FormField } from './components/FormField';
import { ReplyEditor } from './components/ReplyEditor';
import { SubscribeButton } from './components/SubscribeButton';
import { PrivateSelect } from './components/PrivateSelect';
import { CategoryCascader } from './components/CategoryCascader';
import { LeanCloudApp } from './components/LeanCloudApp';
import { ReplyCard } from './components/ReplyCard';
import { useMixedTicket } from './mixed-ticket';
import { langs } from './lang';
import { TicketField_v1, useTicketFields_v1 } from './api1';
import { CustomFields } from './components/CustomFields';
import { useTicketOpsLogs, useTicketReplies } from './timeline-data';
import { RecentTickets } from './components/RecentTickets';
import { Evaluation } from './components/Evaluation';

export function TicketDetail() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();

  const { ticket, update, updating, refetch } = useMixedTicket(id);

  const { replies, fetchMoreReplies, refetchReples } = useTicketReplies(ticket?.id);
  const { opsLogs, fetchMoreOpsLogs } = useTicketOpsLogs(ticket?.id);

  const { mutateAsync: createReply } = useCreateReply({
    onSuccess: () => {
      refetch();
      fetchMoreReplies();
    },
  });

  const { mutate: operate, isLoading: operating } = useOperateTicket({
    onSuccess: () => {
      refetch();
      fetchMoreOpsLogs();
    },
  });

  const handleOperate = (action: string) => {
    if (ticket) {
      operate([ticket.id, action]);
    }
  };

  if (!ticket) {
    return (
      <div className="h-screen flex">
        <Spin style={{ margin: 'auto' }} />
      </div>
    );
  }

  return (
    <div className="h-full bg-white overflow-auto">
      {/* className="relative" for antd dropdown menu position */}
      <div id="ticket_container" className="max-w-[1360px] mx-auto relative">
        <TicketInfo
          ticket={ticket}
          author={ticket.author}
          onBack={() => navigate('..')}
          onChangePrivate={(value) => update({ private: value })}
          onChangeSubscribed={(subscribed) => update({ subscribed })}
          disabled={updating}
        />
        <Row>
          <Col className="p-4" span={24} md={6}>
            {ENABLE_LEANCLOUD_INTEGRATION && ticket.author && (
              <LeanCloudSection ticketId={ticket.id} username={ticket.author.username} />
            )}

            <CategorySection
              categoryId={ticket.categoryId}
              onChange={(categoryId) => update({ categoryId })}
              disabled={updating}
            />

            <CustomFieldsSection ticketId={ticket.id} categoryId={ticket.categoryId} />

            <MetadataSection metadata={ticket.metaData} />
          </Col>
          <Col className="p-4" span={24} md={12}>
            <Timeline
              header={
                <ReplyCard
                  id={ticket.id}
                  author={ticket.author ? <UserLabel user={ticket.author} /> : 'unknown'}
                  createTime={ticket.createdAt}
                  content={ticket.contentSafeHTML}
                  files={ticket.files}
                />
              }
              replies={replies}
              opsLogs={opsLogs}
              onRefetchReplies={refetchReples}
            />

            {ticket.author && (
              <RecentTickets className="mb-5" ticketId={ticket.id} userId={ticket.author.id} />
            )}
            {ticket.evaluation && <Evaluation className="mb-5" evaluation={ticket.evaluation} />}

            <ReplyEditor
              onSubmit={(reply) =>
                createReply({
                  ticketId: ticket.id,
                  content: reply.content,
                  fileIds: reply.fileIds,
                  internal: reply.internal,
                })
              }
              onOperate={handleOperate}
              operating={operating}
            />
          </Col>
          <Col className="p-4" span={24} md={6}>
            <div className="sticky top-4">
              <TicketBasicInfoSection ticket={ticket} onChange={update} disabled={updating} />

              <TagsSection
                tags={ticket.tags}
                privateTags={ticket.privateTags}
                onUpdate={update}
                disabled={updating}
              />

              <Divider>工单操作</Divider>
              <TicketOperations
                status={ticket.status}
                onOperate={handleOperate}
                disabled={operating}
              />
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}

interface TicketInfoProps {
  ticket: {
    nid: number;
    title: string;
    status: number;
    private?: boolean;
    subscribed?: boolean;
    createdAt: string;
    updatedAt: string;
  };
  author?: UserSchema;
  onBack: () => void;
  onChangePrivate: (value: boolean) => void;
  onChangeSubscribed: (value: boolean) => void;
  disabled?: boolean;
}

function TicketInfo({
  ticket,
  author,
  onBack,
  onChangePrivate,
  onChangeSubscribed,
  disabled,
}: TicketInfoProps) {
  return (
    <PageHeader
      className="border-b"
      title={ticket.title}
      tags={
        <span className="mr-4">
          <TicketStatus status={ticket.status} />
        </span>
      }
      onBack={onBack}
      extra={[
        <PrivateSelect
          key="private"
          value={ticket.private}
          onChange={onChangePrivate}
          disabled={disabled}
        />,
        <SubscribeButton
          key="subscribe"
          subscribed={ticket.subscribed}
          onClick={() => onChangeSubscribed(!ticket.subscribed)}
          disabled={disabled}
        />,
        <Button key="legacy" onClick={() => (window.location.href = `/tickets/${ticket.nid}`)}>
          旧版详情页
        </Button>,
      ]}
    >
      <Descriptions size="small">
        <Descriptions.Item label="编号">
          <span className="text-[#AFAFAF]">#{ticket.nid}</span>
        </Descriptions.Item>
        {author && (
          <Descriptions.Item label="创建者">
            <UserLabel user={author} displayUsername />
          </Descriptions.Item>
        )}
        <Descriptions.Item label="创建时间">
          <span title={moment(ticket.createdAt).toLocaleString()}>
            {moment(ticket.createdAt).fromNow()}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">
          <span title={moment(ticket.updatedAt).toLocaleString()}>
            {moment(ticket.updatedAt).fromNow()}
          </span>
        </Descriptions.Item>
      </Descriptions>
    </PageHeader>
  );
}

interface LeanCloudSectionProps {
  ticketId: string;
  username: string;
}

function LeanCloudSection({ ticketId, username }: LeanCloudSectionProps) {
  return (
    <FormField label="应用">
      <LeanCloudApp ticketId={ticketId} username={username} />
    </FormField>
  );
}

interface CategorySectionProps {
  categoryId: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
}

function CategorySection({ categoryId, onChange, disabled }: CategorySectionProps) {
  return (
    <FormField label="分类">
      <CategoryCascader
        allowClear={false}
        categoryId={categoryId}
        onChange={(value: any[]) => onChange(value[value.length - 1])}
        disabled={disabled}
        style={{ width: '100%' }}
      />
    </FormField>
  );
}

function useFormFieldIds(categoryId: string) {
  const { data: category, isLoading: loadingCategory } = useCategory(categoryId);

  const formId = category?.formId;
  const { data: form, isLoading: loadingForm } = useTicketForm(formId || '', {
    enabled: !!formId,
  });

  const fieldIds = useMemo(() => {
    if (form) {
      return form.items.filter((item) => item.type === 'field').map((item) => item.id);
    }
    return [];
  }, [form]);

  return { data: fieldIds, isLoading: loadingCategory || loadingForm };
}

function transformField(field: TicketField_v1) {
  return {
    id: field.id,
    type: field.type,
    label: field.variants[0]?.title || 'unknown',
    options: field.variants[0]?.options?.map(([value, label]) => ({ label, value })),
  };
}

interface CustomFieldsSectionProps {
  ticketId: string;
  categoryId: string;
}

function CustomFieldsSection({ ticketId, categoryId }: CustomFieldsSectionProps) {
  const { data: formFieldIds, isLoading: loadingFormFieldIds } = useFormFieldIds(categoryId);

  const { data: fieldValues, isLoading: loadingFieldValues } = useTicketFieldValues(ticketId);

  const otherFieldIds = useMemo(() => {
    if (!fieldValues) {
      return [];
    }
    const valueFieldIds = fieldValues.map((v) => v.field);
    return difference(valueFieldIds, formFieldIds);
  }, [formFieldIds, fieldValues]);

  const fieldValueMap = useMemo(() => keyBy(fieldValues, (v) => v.field), [fieldValues]);

  const fieldIds = useMemo(() => formFieldIds.concat(otherFieldIds), [formFieldIds, otherFieldIds]);

  const { data: fields, isLoading: loadingFields } = useTicketFields_v1(fieldIds, {
    enabled: !loadingFormFieldIds && !loadingFieldValues,
  });

  const fieldById = useMemo(() => keyBy(fields, (field) => field.id), [fields]);

  const formFields = useMemo(() => {
    const basicFieldIds = ['title', 'details', 'attachments'];
    return formFieldIds
      .filter((id) => !basicFieldIds.includes(id))
      .map((id) => fieldById[id])
      .filter(Boolean)
      .map(transformField);
  }, [formFieldIds, fieldById]);

  const otherFields = useMemo(() => {
    return otherFieldIds
      .map((id) => fieldById[id])
      .filter(Boolean)
      .map(transformField);
  }, [otherFieldIds, fieldById]);

  const { mutate, isLoading: updating } = useUpdateTicketFieldValues();

  const handleUpdate = (values: Record<string, any>) => {
    const valueList = Object.entries(values).map(([field, value]) => ({ field, value }));
    mutate([ticketId, valueList]);
  };

  if (loadingFormFieldIds || loadingFieldValues || loadingFields) {
    return <Skeleton active />;
  }

  return (
    <>
      {formFields.length > 0 && (
        <>
          <Divider>分类表单</Divider>
          <CustomFields
            fields={formFields}
            values={fieldValueMap}
            updating={updating}
            onChange={handleUpdate}
          />
        </>
      )}
      {otherFields.length > 0 && (
        <>
          <Divider>其他字段</Divider>
          <CustomFields
            fields={otherFields}
            values={fieldValueMap}
            updating={updating}
            onChange={handleUpdate}
          />
        </>
      )}
    </>
  );
}

interface MetadataSectionProps {
  metadata?: Record<string, any>;
}

function MetadataSection({ metadata }: MetadataSectionProps) {
  if (!metadata || isEmpty(metadata)) {
    return null;
  }

  return (
    <>
      <Divider>Metadata</Divider>
      <ErrorBoundary
        fallbackRender={({ error }) => <div className="text-red-500">Error: {error.message}</div>}
      >
        <div className="space-y-1">
          {Object.entries(metadata).map(([key, value]) => (
            <MetadataItem key={key} data={{ key, value }} />
          ))}
        </div>
      </ErrorBoundary>
    </>
  );
}

interface MetadataItemProps {
  data: { key: string; value: any };
}

function MetadataItem({ data }: MetadataItemProps) {
  const { label, content } = useMemo(() => {
    const renderer = getMetadataRenderer(data.key);
    if (renderer) {
      return renderer(data.value, data.key);
    }
    const content = typeof data.value === 'string' ? data.value : JSON.stringify(data.value);
    return { label: data.key, content };
  }, [data]);

  return (
    <div className="flex flex-wrap gap-1">
      <div className="font-semibold">{label}:</div>
      <div className="break-all">{content}</div>
    </div>
  );
}

interface TicketBasicInfoSectionProps {
  ticket: {
    id: string;
    groupId?: string;
    assigneeId?: string;
    language?: string;
  };
  onChange: (data: {
    groupId?: string | null;
    assigneeId?: string | null;
    language?: string | null;
  }) => void;
  disabled?: boolean;
}

function TicketBasicInfoSection({ ticket, onChange, disabled }: TicketBasicInfoSectionProps) {
  const groups = useGroups();

  return (
    <>
      <FormField label="客服组">
        <Select
          className="w-full"
          allowClear
          showSearch
          optionFilterProp="name"
          loading={groups.isLoading}
          options={groups.data}
          fieldNames={{ label: 'name', value: 'id' }}
          placeholder="未分配"
          value={ticket.groupId}
          onChange={(groupId) => onChange({ groupId: groupId ?? null })}
          disabled={disabled}
        />
      </FormField>

      <AssigneeSection
        groupId={ticket.groupId}
        assigneeId={ticket.assigneeId}
        onChangeAssignee={(assigneeId) => onChange({ assigneeId: assigneeId ?? null })}
        disabled={disabled}
      />

      <FormField label="语言">
        <Select
          className="w-full"
          allowClear
          placeholder="未设置"
          options={langs}
          fieldNames={{ label: 'name', value: 'code' }}
          value={ticket.language}
          onChange={(language) => onChange({ language: language ?? null })}
          disabled={disabled}
        />
      </FormField>

      <AssociatedTickets ticketId={ticket.id} />
    </>
  );
}

interface AssociatedTicketsProps {
  ticketId: string;
}

function AssociatedTickets({ ticketId }: AssociatedTicketsProps) {
  const queryClient = useQueryClient();

  const { data: associatedTickets } = useAssociatedTickets(ticketId);

  const disassociate = useDisassociateTickets({
    onSuccess: () => {
      queryClient.invalidateQueries(['AssociatedTickets', ticketId]);
    },
  });

  if (!associatedTickets || associatedTickets.length === 0) {
    return null;
  }

  return (
    <FormField label="关联工单">
      {associatedTickets.map((ticket) => (
        <div className="flex items-center">
          <TicketLink className="flex-1 min-w-0" ticket={ticket} />
          <Button
            type="text"
            size="small"
            title="解除关联"
            icon={<AiOutlineApi className="w-4 h-4 m-auto" />}
            loading={disassociate.isLoading}
            onClick={() => disassociate.mutate([ticketId, ticket.id])}
          />
        </div>
      ))}
    </FormField>
  );
}

interface AssigneeSectionProps {
  groupId?: string;
  assigneeId?: string;
  onChangeAssignee: (assigneeId: string | undefined) => void;
  disabled?: boolean;
}

function AssigneeSection({
  groupId,
  assigneeId,
  onChangeAssignee,
  disabled,
}: AssigneeSectionProps) {
  const { data: customerServices, isLoading: loadingCustomerServices } = useCustomerServices();
  const { data: group } = useGroup(groupId || '', {
    enabled: groupId !== undefined,
  });
  const { data: collaborators } = useCollaborators();

  const [groupMembers, otherCustomerServices] = useMemo(() => {
    if (customerServices && group) {
      return partition(customerServices, (user) => group.userIds.includes(user.id));
    }
    return [undefined, customerServices];
  }, [customerServices, group]);

  const assigneeIsGroupMember = useMemo(() => {
    if (groupMembers && assigneeId) {
      return groupMembers.findIndex((user) => user.id === assigneeId) !== -1;
    }
  }, [groupMembers, assigneeId]);

  const createOptions = (users: UserSchema[]) => {
    return users.map((user) => ({
      name: user.nickname,
      label: <UserLabel user={user} />,
      value: user.id,
    }));
  };

  const options = useMemo(() => {
    const options: DefaultOptionType[] = [];
    if (group && groupMembers?.length) {
      options.push({
        label: group.name,
        options: createOptions(groupMembers),
      });
    }
    if (otherCustomerServices?.length) {
      options.push({
        label: groupMembers?.length ? '其他客服' : '客服',
        options: createOptions(otherCustomerServices),
      });
    }
    if (collaborators && collaborators.length) {
      options.push({
        label: '协作者',
        options: createOptions(collaborators),
      });
    }
    return options;
  }, [customerServices, group, groupMembers, collaborators]);

  const currentUser = useCurrentUser();

  return (
    <FormField
      label={
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div>负责人</div>
            {assigneeIsGroupMember === false && (
              <Tooltip title="负责人不是当前客服组的成员">
                <AiFillExclamationCircle className="ml-1 inline-block w-4 h-4 text-[#ff4d4f]" />
              </Tooltip>
            )}
          </div>
          {currentUser && currentUser.id !== assigneeId && (
            <button
              className="text-primary disabled:text-gray-400"
              disabled={disabled}
              onClick={() => onChangeAssignee(currentUser.id)}
            >
              分配给我
            </button>
          )}
        </div>
      }
    >
      <Select
        className="w-full"
        allowClear
        showSearch
        optionFilterProp="name"
        loading={loadingCustomerServices}
        options={options}
        placeholder="未分配"
        value={assigneeId}
        onChange={onChangeAssignee}
        disabled={disabled}
      />
    </FormField>
  );
}

interface TagsSectionProps {
  tags: TagData[];
  privateTags: TagData[];
  onUpdate: (data: { tags?: TagData[]; privateTags?: TagData[] }) => void;
  disabled?: boolean;
}

function TagsSection({ tags, privateTags, onUpdate, disabled }: TagsSectionProps) {
  const { data: tagMetadatas } = useTagMetadatas();

  if (!tagMetadatas) {
    return <Skeleton active />;
  }

  if (tagMetadatas.length === 0) {
    return null;
  }

  return (
    <>
      <Divider>标签</Divider>
      <TagForm
        tagMetadatas={tagMetadatas}
        tags={tags}
        privateTags={privateTags}
        onUpdate={(tags, isPrivate) => {
          if (isPrivate) {
            onUpdate({ privateTags: tags });
          } else {
            onUpdate({ tags });
          }
        }}
        updating={disabled}
      />
    </>
  );
}

interface TicketOperationsProps {
  status: number;
  onOperate: (action: string) => void;
  disabled?: boolean;
}

function TicketOperations({ status, onOperate, disabled }: TicketOperationsProps) {
  return (
    <div className="space-x-2">
      {status < 200 && (
        <>
          {import.meta.env.VITE_ENABLE_USER_CONFIRMATION && (
            <Button disabled={disabled} onClick={() => onOperate('resolve')}>
              已解决
            </Button>
          )}
          <Button disabled={disabled} onClick={() => onOperate('close')}>
            关闭
          </Button>
        </>
      )}
      {status > 200 && (
        <Button disabled={disabled} onClick={() => onOperate('reopen')}>
          重新打开
        </Button>
      )}
    </div>
  );
}
