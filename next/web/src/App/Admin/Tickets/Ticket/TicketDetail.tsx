import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AiFillExclamationCircle } from 'react-icons/ai';
import moment from 'moment';
import { partition } from 'lodash-es';
import { DefaultOptionType } from 'antd/lib/select';

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
import { useCurrentUser } from '@/leancloud';
import { CategorySelect } from '@/components/common';
import { TicketStatus } from '../../components/TicketStatus';
import { Timeline } from './Timeline';
import { TagForm } from './TagForm';
import { FormField } from './components/FormField';
import { ReplyEditor } from './components/ReplyEditor';
import { SubscribeButton } from './components/SubscribeButton';
import { PrivateSelect } from './components/PrivateSelect';
import { TicketContextProvider, useTicketContext } from './TicketContext';
import { langs } from './lang';

export function TicketDetail() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();

  return (
    <div className="h-full bg-white overflow-auto">
      <div className="max-w-[1360px] mx-auto">
        <TicketContextProvider
          ticketId={id}
          fallback={
            <div className="h-screen flex">
              <Spin style={{ margin: 'auto' }} />
            </div>
          }
        >
          <TicketInfo onBack={() => navigate('..')} />
          <Row>
            <Col className="p-4" span={24} md={6}>
              <LeftSider />
            </Col>
            <Col className="p-4" span={24} md={12}>
              <Timeline />
              <ReplyEditor />
            </Col>
            <Col className="p-4" span={24} md={6}>
              <RightSider />
            </Col>
          </Row>
        </TicketContextProvider>
      </div>
    </div>
  );
}

interface TicketInfoProps {
  onBack: () => void;
}

function TicketInfo({ onBack }: TicketInfoProps) {
  const { ticket, update, updating } = useTicketContext();

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
          loading={updating}
          disabled={updating}
          value={ticket.private}
          onChange={(isPrivate) => update({ private: isPrivate })}
        />,
        <SubscribeButton
          key="subscribe"
          subscribed={ticket.subscribed}
          onClick={() => update({ subscribed: !ticket.subscribed })}
          loading={updating}
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
        {ticket.author && (
          <Descriptions.Item label="创建者">
            <UserLabel user={ticket.author} />
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

function LeftSider() {
  return (
    <>
      <CategorySection />
    </>
  );
}

function CategorySection() {
  const { ticket } = useTicketContext();

  return (
    <FormField label="分类">
      <CategorySelect
        categoryActive
        allowClear={false}
        value={ticket.categoryId}
        style={{ width: '100%' }}
      />
    </FormField>
  );
}

function RightSider() {
  return (
    <div className="sticky top-4">
      <TicketBasicInfoSection />

      <TagsSection />

      <Divider>工单操作</Divider>
      <TicketOperations />
    </div>
  );
}

function TicketBasicInfoSection() {
  const { ticket, update, updating } = useTicketContext();
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
          onChange={(groupId) => update({ groupId: groupId ?? null })}
          disabled={updating}
        />
      </FormField>

      <AssigneeSection
        groupId={ticket.groupId}
        assigneeId={ticket.assigneeId}
        onChangeAssignee={(assigneeId) => update({ assigneeId: assigneeId ?? null })}
        disabled={updating}
      />

      <FormField label="语言">
        <Select
          className="w-full"
          allowClear
          placeholder="未设置"
          options={langs}
          fieldNames={{ label: 'name', value: 'code' }}
          value={ticket.language}
          onChange={(language) => update({ language: language ?? null })}
          disabled={updating}
        />
      </FormField>
    </>
  );
}

export interface AssigneeSectionProps {
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
                <AiFillExclamationCircle className="inline-block text-red-500 w-4 h-4" />
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
        optionFilterProp="label"
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

function createOptions(users: { id: string; nickname: string }[]) {
  return users.map((user) => ({
    label: user.nickname,
    value: user.id,
  }));
}

function TagsSection() {
  const { ticket, update, updating } = useTicketContext();
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
        tags={ticket.tags}
        privateTags={ticket.privateTags}
        onUpdate={(tags, isPrivate) => {
          if (isPrivate) {
            update({ privateTags: tags });
          } else {
            update({ tags });
          }
        }}
        updating={updating}
      />
    </>
  );
}

function TicketOperations() {
  const { ticket, operate, operating } = useTicketContext();

  return (
    <div className="space-x-2">
      {ticket.status < 200 && (
        <>
          {import.meta.env.VITE_ENABLE_USER_CONFIRMATION && (
            <Button disabled={operating} onClick={() => operate('resolve')}>
              已解决
            </Button>
          )}
          <Button disabled={operating} onClick={() => operate('close')}>
            关闭
          </Button>
        </>
      )}
      {ticket.status > 200 && (
        <Button disabled={operating} onClick={() => operate('reopen')}>
          重新打开
        </Button>
      )}
    </div>
  );
}
