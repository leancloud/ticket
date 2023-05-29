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
  Tooltip,
} from '@/components/antd';
import { UserLabel } from '@/App/Admin/components';
import {
  TicketDetailSchema,
  UpdateTicketData,
  useOperateTicket,
  useTicket,
  useUpdateTicket,
} from '@/api/ticket';
import { useGroup, useGroups } from '@/api/group';
import { useCustomerServices } from '@/api/customer-service';
import { useCollaborators } from '@/api/collaborator';
import { useCurrentUser } from '@/leancloud';
import { CategorySelect } from '@/components/common';
import { TicketStatus } from '../../components/TicketStatus';
import { UpdateTicket_v1Data, useTicket_v1, useUpdateTicket_v1, V1_Ticket } from './api1';
import { Timeline } from './Timeline';
import { TagForm } from './TagForm';
import { FormField } from './components/FormField';
import { ReplyEditor } from './components/ReplyEditor';
import { SubscribeButton } from './components/SubscribeButton';
import { PrivateSelect } from './components/PrivateSelect';

export function TicketDetail() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();

  const { data: ticket, refetch } = useTicket(id, {
    include: ['author', 'files'],
  });
  const { data: ticket_v1, refetch: refetch_v1 } = useTicket_v1(ticket ? ticket.id : '', {
    enabled: ticket !== undefined,
  });

  const { mutate: update, isLoading: updating } = useUpdateTicket({
    onSuccess: () => {
      refetch();
    },
  });
  const { mutate: update_v1, isLoading: updating_v1 } = useUpdateTicket_v1({
    onSuccess: () => {
      refetch_v1();
    },
  });

  const handleUpdate = (data: UpdateTicketData) => {
    if (ticket) {
      update([ticket.id, data]);
    }
  };
  const handleUpdate_v1 = (data: UpdateTicket_v1Data) => {
    if (ticket) {
      update_v1([ticket.id, data]);
    }
  };

  const { mutate: operate, isLoading: operating } = useOperateTicket({
    onSuccess: () => {
      refetch();
    },
  });

  const handleOperate = (action: string) => {
    if (ticket) {
      operate([ticket.id, action]);
    }
  };

  return (
    <div className="h-full bg-white overflow-auto">
      <div className="max-w-[1360px] mx-auto">
        <TicketInfo
          onBack={() => navigate('..')}
          ticket={ticket}
          ticket_v1={ticket_v1}
          updating={updating || updating_v1}
          onChangePrivate={(v) => handleUpdate_v1({ private: v })}
          onChangeSubscribed={(v) => handleUpdate_v1({ subscribed: v })}
        />

        <Row>
          <Col className="p-4" span={24} md={6}>
            <LeftSider ticket={ticket} />
          </Col>
          <Col className="p-4" span={24} md={12}>
            {ticket ? <Timeline ticket={ticket} /> : <Skeleton active paragraph={{ rows: 10 }} />}
            <ReplyEditor onOperate={handleOperate} operating={operating} />
          </Col>
          <Col className="p-4" span={24} md={6}>
            {ticket && (
              <RightSider
                ticket={ticket}
                onUpdate={handleUpdate}
                updating={updating}
                onOperate={handleOperate}
                operating={operating}
              />
            )}
          </Col>
        </Row>
      </div>
    </div>
  );
}

interface TicketInfoProps {
  ticket?: TicketDetailSchema;
  ticket_v1?: V1_Ticket;
  updating?: boolean;
  onBack: () => void;
  onChangePrivate: (_private: boolean) => void;
  onChangeSubscribed: (subscribed: boolean) => void;
}

function TicketInfo({
  ticket,
  ticket_v1,
  updating,
  onBack,
  onChangePrivate,
  onChangeSubscribed,
}: TicketInfoProps) {
  if (!ticket) {
    return (
      <PageHeader className="border-b">
        <Skeleton active paragraph={{ rows: 2 }} />
      </PageHeader>
    );
  }

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
        ticket_v1 && (
          <PrivateSelect
            key="private"
            loading={updating}
            disabled={updating}
            value={ticket_v1.private}
            onChange={onChangePrivate}
          />
        ),
        ticket_v1 && (
          <SubscribeButton
            key="subscribe"
            subscribed={ticket_v1.subscribed}
            onClick={() => onChangeSubscribed(!ticket_v1.subscribed)}
            loading={updating}
          />
        ),
        ticket && (
          <Button key="legacy" onClick={() => (window.location.href = `/tickets/${ticket.nid}`)}>
            旧版详情页
          </Button>
        ),
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

interface LeftSiderProps {
  ticket?: TicketDetailSchema;
}

function LeftSider({ ticket }: LeftSiderProps) {
  if (!ticket) {
    return <Skeleton active />;
  }

  return (
    <>
      <div className="pb-2">分类</div>
      <CategorySelect
        categoryActive
        allowClear={false}
        value={ticket.categoryId}
        style={{ width: '100%' }}
      />
    </>
  );
}

interface RightSiderProps {
  ticket: TicketDetailSchema;
  onUpdate: (data: Partial<UpdateTicketData>) => void;
  updating?: boolean;
  onOperate: (action: string) => void;
  operating?: boolean;
}

function RightSider({ ticket, onUpdate, updating, onOperate, operating }: RightSiderProps) {
  return (
    <div className="sticky top-4">
      <GroupSection
        groupId={ticket.groupId}
        onChange={(groupId) => onUpdate({ groupId: groupId ?? null })}
        updating={updating}
      />

      <AssigneeSection
        groupId={ticket.groupId}
        assigneeId={ticket.assigneeId}
        onChangeAssignee={(assigneeId) => onUpdate({ assigneeId: assigneeId ?? null })}
        disabled={updating}
      />

      <Divider />
      <TagForm ticketId={ticket.id} />

      <Divider />
      <TicketOperations ticketStatus={ticket.status} onOperate={onOperate} operating={operating} />
    </div>
  );
}

interface GroupSectionProps {
  groupId?: string;
  onChange: (groupId: string | undefined) => void;
  updating?: boolean;
}

function GroupSection({ groupId, onChange, updating }: GroupSectionProps) {
  const { data: groups, isLoading } = useGroups();

  return (
    <FormField label="客服组">
      <Select
        className="w-full"
        allowClear
        showSearch
        optionFilterProp="name"
        loading={isLoading}
        options={groups}
        fieldNames={{ label: 'name', value: 'id' }}
        placeholder="未分配"
        value={groupId}
        onChange={onChange}
        disabled={updating}
      />
    </FormField>
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
    return [[], []];
  }, [customerServices, group]);

  const assigneeIsGroupMember = useMemo(() => {
    if (groupMembers && assigneeId) {
      return groupMembers.findIndex((user) => user.id === assigneeId) !== -1;
    }
  }, [groupMembers, assigneeId]);

  const options = useMemo(() => {
    const options: DefaultOptionType[] = [];
    if (group && groupMembers.length) {
      options.push({
        label: group.name,
        options: createOptions(groupMembers),
      });
    }
    if (otherCustomerServices.length) {
      options.push({
        label: groupMembers.length ? '其他客服' : '客服',
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

interface TicketOperationsProps {
  ticketStatus: number;
  onOperate: (action: string) => void;
  operating?: boolean;
}

function TicketOperations({ ticketStatus, operating, onOperate }: TicketOperationsProps) {
  return (
    <FormField label="工单操作">
      <div className="space-x-2">
        {ticketStatus < 200 && (
          <>
            {import.meta.env.VITE_ENABLE_USER_CONFIRMATION && (
              <Button disabled={operating} onClick={() => onOperate('resolve')}>
                已解决
              </Button>
            )}
            <Button disabled={operating} onClick={() => onOperate('close')}>
              关闭
            </Button>
          </>
        )}
        {ticketStatus > 200 && (
          <Button disabled={operating} onClick={() => onOperate('reopen')}>
            重新打开
          </Button>
        )}
      </div>
    </FormField>
  );
}
