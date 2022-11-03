import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';
import {
  Button,
  Col,
  Descriptions,
  NULL_STRING,
  PageHeader,
  Row,
  Select,
  Skeleton,
} from '@/components/antd';
import { UserLabel } from '@/App/Admin/components';
import { TicketDetailSchema, UpdateTicketData, useTicket, useUpdateTicket } from '@/api/ticket';
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
        <Col className="px-[15px]" span={24} md={6}>
          {ticket ? (
            <div className="ant-form-vertical">
              <div className="pb-2">分类</div>
              <CategorySelect
                categoryActive
                allowClear={false}
                value={ticket.categoryId}
                disabled={updating}
                onChange={(categoryId) => handleUpdate({ categoryId })}
                style={{ width: '100%' }}
              />
            </div>
          ) : (
            <Skeleton active />
          )}
        </Col>
        <Col className="px-[15px]" span={24} md={12}>
          {ticket ? <Timeline ticket={ticket} /> : <Skeleton active paragraph={{ rows: 10 }} />}
        </Col>
        <Col className="px-[15px]" span={24} md={6}>
          <div className="sticky top-4 pb-4">
            {ticket ? (
              <RightSider ticket={ticket} onUpdate={handleUpdate} updating={updating} />
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
}

function RightSider({ ticket, onUpdate, updating }: RightSiderProps) {
  const currentUser = useCurrentUser();

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
        <FormLabel className="flex justify-between">
          负责人
          {ticket && ticket.assigneeId !== currentUser!.id && (
            <button
              className="text-primary disabled:text-gray-400"
              disabled={updating}
              onClick={() => onUpdate({ assigneeId: currentUser!.id })}
            >
              分配给我
            </button>
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
    </>
  );
}
