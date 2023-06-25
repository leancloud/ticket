import { useState } from 'react';
import { useQueryClient } from 'react-query';
import moment, { Moment } from 'moment';

import { useCurrentUser } from '@/leancloud';
import { VacationSchema, useDeleteVacation, useVacations, useCreateVacation } from '@/api/vacation';
import { Button, DatePicker, Form, Modal, Table, TableProps, message } from '@/components/antd';
import { CustomerServiceSelect } from '@/components/common';
import { usePage } from '@/utils/usePage';

const PAGE_SIZE = 20;

interface VacationModalProps {
  visible: boolean;
  onHide: () => void;
}

function VacationModal({ visible, onHide }: VacationModalProps) {
  const [vacationerId, setVacatonerId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Moment, Moment] | undefined | null>();

  const queryClient = useQueryClient();
  const { mutate, isLoading } = useCreateVacation({
    onSuccess: () => {
      message.success('请假成功');
      queryClient.invalidateQueries('vacations');
      onHide();
      setVacatonerId(undefined);
      setDateRange(undefined);
    },
  });

  const handleOk = () =>
    mutate({
      vacationerId: vacationerId!,
      startDate: dateRange![0].toISOString(),
      endDate: dateRange![1].toISOString(),
    });

  return (
    <Modal
      visible={visible}
      title="请假"
      confirmLoading={isLoading}
      onOk={handleOk}
      okButtonProps={{ disabled: isLoading || !vacationerId || !dateRange }}
      onCancel={() => !isLoading && onHide()}
      cancelButtonProps={{ disabled: isLoading }}
    >
      <Form layout="vertical">
        <Form.Item label="用户名" style={{ marginBottom: 16 }}>
          <CustomerServiceSelect autoFocus value={vacationerId} onChange={setVacatonerId as any} />
        </Form.Item>

        <Form.Item label="起止时间" style={{ marginBottom: 16 }}>
          <DatePicker.RangePicker
            showTime
            disabledDate={(current) => current < moment().startOf('day')}
            className="w-full"
            value={dateRange}
            onChange={setDateRange as any}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function VacationActions({ id, vacationer, operator }: VacationSchema) {
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useDeleteVacation({
    onSuccess: () => {
      message.success('删除假期成功');
      queryClient.invalidateQueries('vacations');
    },
  });

  const handleDelete = () => {
    Modal.confirm({
      title: '删除假期',
      content: '此操作不可恢复',
      onOk: () => mutate(id),
    });
  };

  return (
    <div>
      <Button danger type="link" size="small" disabled={isLoading} onClick={handleDelete}>
        删除
      </Button>
    </div>
  );
}

const columns: TableProps<VacationSchema>['columns'] = [
  {
    dataIndex: 'vacationer',
    title: '用户名',
    render: (user: VacationSchema['vacationer']) => user.nickname,
  },
  {
    dataIndex: 'startDate',
    title: '开始时间',
    render: (str: string) => moment(str).format('YYYY-MM-DD HH:mm'),
  },
  {
    dataIndex: 'endDate',
    title: '结束时间',
    render: (str: string) => moment(str).format('YYYY-MM-DD HH:mm'),
  },
  {
    dataIndex: 'operator',
    title: '提交人',
    render: (user: VacationSchema['operator']) => user.nickname,
  },
  {
    dataIndex: 'createdAt',
    title: '提交时间',
    render: (str: string) => moment(str).format('YYYY-MM-DD HH:mm'),
  },
  {
    key: 'actions',
    title: '操作',
    render: (vacation: VacationSchema) => <VacationActions {...vacation} />,
  },
];

export function Vacations() {
  const currentUser = useCurrentUser();
  const [page, { set: setPage }] = usePage();
  const [showModal, setShowModal] = useState(false);

  const {
    data: vacations,
    totalCount,
    isLoading,
  } = useVacations({
    vacationerId: currentUser?.id,
    operatorId: currentUser?.id,
    page,
    pageSize: PAGE_SIZE,
    orderBy: 'createdAt-desc',
  });

  return (
    <div className="p-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">请假</h1>

      <div className="flex flex-row-reverse mb-5">
        <Button type="primary" onClick={() => setShowModal(true)}>
          请假
        </Button>
      </div>

      <VacationModal visible={showModal} onHide={() => setShowModal(false)} />
      <Table
        columns={columns}
        rowKey="id"
        dataSource={vacations}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: totalCount,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />
    </div>
  );
}
