import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';
import { Button, Col, Descriptions, PageHeader, Row, Select, Skeleton } from '@/components/antd';
import { UserLabel } from '@/App/Admin/components';
import { UpdateTicketData, useTicket, useUpdateTicket } from '@/api/ticket';
import { CategorySelect } from '@/components/common';
import { TicketStatus } from '../components/TicketStatus';
import { Timeline } from './Timeline';

export function TicketDetail() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();

  const { data: ticket, refetch } = useTicket(id, {
    include: ['author'],
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
        extra={[<AccessControl key="1" />, <SubscribeTicket key="2" />]}
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
          <div className="ant-form-vertical">
            <div className="pb-2">分类</div>
            <CategorySelect
              categoryActive
              value={ticket?.categoryId}
              disabled={updating}
              onChange={(categoryId) => categoryId && handleUpdate({ categoryId })}
              style={{ width: '100%' }}
            />
          </div>
        </Col>
        <Col className="px-[15px]" span={24} md={12}>
          {ticket ? <Timeline ticket={ticket} /> : <Skeleton active paragraph={{ rows: 10 }} />}
        </Col>
        <Col className="px-[15px]" span={24} md={6}>
          <div className="ant-form-vertical sticky top-4">
            <div className="pb-2 inline-flex items-center">
              客服组
              <span className="bg-gray-500 text-white rounded-sm text-sm px-1 ml-1 font-semibold">
                internal
              </span>
            </div>
            <Select className="w-full" />

            <div className="flex justify-between pb-2 mt-4">
              负责人<button className="text-primary">分配给我</button>
            </div>
            <Select className="w-full" />
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

function AccessControl() {
  return (
    <Select
      options={[
        { label: <div>员工可见</div>, value: 'internal' },
        { label: '仅客服可见', value: 'private' },
      ]}
      value={'internal'}
    />
  );
}

function SubscribeTicket() {
  return <Button>关注</Button>;
}
