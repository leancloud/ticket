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
import { useGroup } from '@/api/group';
import { useCurrentUser } from '@/leancloud';
import {
  CategorySelect,
  SingleCustomerServiceSelect,
  SingleGroupSelect,
} from '@/components/common';
import { TicketStatus } from '../components/TicketStatus';
import { Timeline } from './Timeline';
import { TagForm } from './TagForm';
import { FormLabel } from './components/FormLabel';
import { ReplyEditor } from './components/ReplyEditor';
import { useTicket_v1, useUpdateTicket_v1 } from './api1';

export function TicketDetail() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();

  const { data: ticket, refetch } = useTicket(id, {
    include: ['author', 'files'],
  });

  const { mutate: update, isLoading: updating } = useUpdateTicket({
    onSuccess: () => {
      refetch();
    },
  });

  const handleUpdate = (data: UpdateTicketData) => {
    if (ticket) {
      update([ticket.id, data]);
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
      <PageHeader
        className="border-b"
        title={
          ticket ? (
            <TicketTitle status={ticket.status} title={ticket.title} />
          ) : (
            <Skeleton.Input active size="small" style={{ width: 400 }} />
          )
        }
        onBack={() => navigate('..')}
        extra={ticket && <HeaderExtra ticketId={ticket.id} />}
      >
        {ticket ? (
          <Descriptions size="small">
            <Descriptions.Item label="编号">
              <span className="text-[#AFAFAF]">#{ticket.nid}</span>
            </Descriptions.Item>
            <Descriptions.Item label="创建者">
              <UserLabel user={ticket.author!} />
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              <span title={ticket.createdAt}>{moment(ticket.createdAt).fromNow()}</span>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Skeleton active title={false} style={{ maxWidth: 600 }} />
        )}
      </PageHeader>

      <Row className="mt-4">
        <Col className="px-[15px] pb-4" span={24} md={6}>
          {ticket ? (
            <>
              <div className="pb-2">分类</div>
              <CategorySelect
                categoryActive
                allowClear={false}
                value={ticket.categoryId}
                disabled={updating}
                onChange={(categoryId) => handleUpdate({ categoryId })}
                style={{ width: '100%' }}
              />
            </>
          ) : (
            <Skeleton active />
          )}
        </Col>
        <Col className="px-[15px] pb-4" span={24} md={12}>
          {ticket ? <Timeline ticket={ticket} /> : <Skeleton active paragraph={{ rows: 10 }} />}
          <ReplyEditor onOperate={handleOperate} operating={operating} />
        </Col>
        <Col className="px-[15px]" span={24} md={6}>
          <div className="sticky top-4 pb-4">
            {ticket ? (
              <RightSider
                ticket={ticket}
                onUpdate={handleUpdate}
                updating={updating}
                onOperate={handleOperate}
                operating={operating}
              />
            ) : (
              <Skeleton active />
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
}

function TicketTitle({ title, status }: { title: string; status: number }) {
  return (
    <div className="flex items-center">
      <TicketStatus status={status} />
      <div className="ml-2 truncate" title={title}>
        {title}
      </div>
    </div>
  );
}

function HeaderExtra({ ticketId }: { ticketId: string }) {
  const { data, isLoading } = useTicket_v1(ticketId);

  const { mutate, isLoading: updating } = useUpdateTicket_v1(ticketId);

  return (
    <>
      <Select
        loading={isLoading}
        disabled={updating}
        options={[
          { label: '员工可见', value: 'internal' },
          { label: '仅客服可见', value: 'private' },
        ]}
        value={data?.private ? 'private' : 'internal'}
        onChange={(value) => mutate({ private: value === 'private' })}
      />
      <Button
        loading={isLoading}
        disabled={updating}
        onClick={() => mutate({ subscribed: !data!.subscribed })}
      >
        {data?.subscribed ? '取消关注' : '关注'}
      </Button>
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

  return (
    <>
      <div>
        <FormLabel>客服组</FormLabel>
        <SingleGroupSelect
          includeNull
          value={ticket?.groupId ?? NULL_STRING}
          disabled={updating}
          onChange={(groupId) => onUpdate({ groupId })}
          style={{ width: '100%' }}
        />
      </div>

      <div className="mt-4">
        <FormLabel className="flex items-center">
          <div>负责人</div>
          {assigneeInGroup === false && (
            <Tooltip title={`负责人不是客服组 ${group!.name} 的成员`}>
              <AiFillExclamationCircle className="inline-block text-red-500 w-4 h-4" />
            </Tooltip>
          )}
          {ticket && ticket.assigneeId !== currentUser!.id && (
            <>
              <div className="grow" />
              <button
                className="text-primary disabled:text-gray-400"
                disabled={updating}
                onClick={() => onUpdate({ assigneeId: currentUser!.id })}
              >
                分配给我
              </button>
            </>
          )}
        </FormLabel>
        <SingleCustomerServiceSelect
          includeNull
          value={ticket?.assigneeId ?? NULL_STRING}
          disabled={updating}
          onChange={(assigneeId) => onUpdate({ assigneeId })}
          style={{ width: '100%' }}
        />
      </div>

      <TagForm ticketId={ticket.id} />

      <TicketOperations ticketStatus={ticket.status} onOperate={onOperate} operating={operating} />
    </>
  );
}

interface TicketOperationsProps {
  ticketStatus: number;
  onOperate: (action: string) => void;
  operating?: boolean;
}

function TicketOperations({ ticketStatus, operating, onOperate }: TicketOperationsProps) {
  return (
    <div>
      <Divider />
      <FormLabel>工单操作</FormLabel>
      <div>
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
    </div>
  );
}
