import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
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
import { UpdateTicketData, useTicket, useUpdateTicket } from '@/api/ticket';
import { http, useCurrentUser } from '@/leancloud';
import {
  CategorySelect,
  SingleCustomerServiceSelect,
  SingleGroupSelect,
} from '@/components/common';
import { TicketStatus } from '../components/TicketStatus';
import { Timeline } from './Timeline';

export function TicketDetail() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

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
          <div className="ant-form-vertical sticky top-4">
            {ticket ? (
              <>
                <div className="pb-2 inline-flex items-center">
                  客服组
                  <span className="bg-gray-500 text-white rounded-sm text-sm px-1 ml-1 font-semibold">
                    internal
                  </span>
                </div>
                <SingleGroupSelect
                  value={ticket?.groupId}
                  disabled={updating}
                  onChange={(groupId) => handleUpdate({ groupId })}
                  style={{ width: '100%' }}
                />

                <div className="flex justify-between pb-2 mt-4">
                  负责人
                  {ticket && ticket.assigneeId !== currentUser!.id && (
                    <button
                      className="text-primary disabled:text-gray-400"
                      disabled={updating}
                      onClick={() => handleUpdate({ assigneeId: currentUser!.id })}
                    >
                      分配给我
                    </button>
                  )}
                </div>
                <SingleCustomerServiceSelect
                  includeNull
                  value={ticket?.assigneeId ?? NULL_STRING}
                  disabled={updating}
                  onChange={(assigneeId) => handleUpdate({ assigneeId })}
                  style={{ width: '100%' }}
                />
              </>
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
  // TODO: switch to /api/2
  interface V1_Ticket {
    private: boolean;
    subscribed: boolean;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['v1_ticket', ticketId],
    queryFn: async () => {
      const res = await http.get<V1_Ticket>(`/api/1/tickets/${ticketId}`);
      return res.data;
    },
  });

  const queryClient = useQueryClient();

  const { mutate, isLoading: updating } = useMutation({
    mutationFn: (data: Partial<V1_Ticket>) => {
      return http.patch(`/api/1/tickets/${ticketId}`, data);
    },
    onSuccess: (_, data) => {
      queryClient.setQueryData<V1_Ticket | undefined>(['v1_ticket', ticketId], (prev) => {
        if (prev) {
          return { ...prev, ...data };
        }
      });
    },
  });

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
