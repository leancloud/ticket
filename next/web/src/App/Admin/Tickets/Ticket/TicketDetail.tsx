import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AiFillExclamationCircle } from 'react-icons/ai';
import moment from 'moment';

import {
  Button,
  Col,
  Descriptions,
  Divider,
  NULL_STRING,
  PageHeader,
  Row,
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
import { useGroup } from '@/api/group';
import { useCurrentUser } from '@/leancloud';
import {
  CategorySelect,
  SingleCustomerServiceSelect,
  SingleGroupSelect,
} from '@/components/common';
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
          <span title={ticket.createdAt}>{moment(ticket.createdAt).fromNow()}</span>
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">
          <span title={ticket.updatedAt}>{moment(ticket.updatedAt).fromNow()}</span>
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
  const currentUser = useCurrentUser();

  const { data: group } = useGroup(ticket.groupId!, {
    enabled: ticket.groupId !== undefined,
  });

  const assigneeInGroup = useMemo(() => {
    if (!group || !ticket.assigneeId) {
      return;
    }
    if (!group.userIds) {
      return false;
    }
    return group.userIds.includes(ticket.assigneeId);
  }, [ticket.assigneeId, group]);

  const assigneeIsCurrentUser = ticket && currentUser && ticket.assigneeId === currentUser.id;

  return (
    <div className="sticky top-4">
      <FormField label="客服组">
        <SingleGroupSelect
          includeNull
          value={ticket?.groupId ?? NULL_STRING}
          disabled={updating}
          onChange={(groupId) => onUpdate({ groupId })}
          style={{ width: '100%' }}
        />
      </FormField>

      <FormField
        label={
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div>负责人</div>
              {assigneeInGroup === false && (
                <Tooltip title="负责人不是当前客服组的成员">
                  <AiFillExclamationCircle className="inline-block text-red-500 w-4 h-4" />
                </Tooltip>
              )}
            </div>
            {assigneeIsCurrentUser === false && (
              <button
                className="text-primary disabled:text-gray-400"
                disabled={updating}
                onClick={() => onUpdate({ assigneeId: currentUser!.id })}
              >
                分配给我
              </button>
            )}
          </div>
        }
      >
        <SingleCustomerServiceSelect
          includeNull
          value={ticket?.assigneeId ?? NULL_STRING}
          disabled={updating}
          onChange={(assigneeId) => onUpdate({ assigneeId })}
          style={{ width: '100%' }}
        />
      </FormField>

      <Divider />
      <TagForm ticketId={ticket.id} />

      <Divider />
      <TicketOperations ticketStatus={ticket.status} onOperate={onOperate} operating={operating} />
    </div>
  );
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
