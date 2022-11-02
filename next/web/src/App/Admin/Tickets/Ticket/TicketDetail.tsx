import { useState } from 'react';
import { Button, Col, Descriptions, PageHeader, Row, Select } from '@/components/antd';
import { UserLabel } from '@/App/Admin/components';
import { TicketStatus } from '../components/TicketStatus';
import { Timeline } from './Timeline';
import { useParams } from 'react-router-dom';

export function TicketDetail() {
  const { id: nid } = useParams() as { id: string };

  return (
    <div className="h-full bg-white overflow-auto">
      <PageHeader
        className="border-b"
        title={<TicketTitle status={50} title={'工单标题'} />}
        onBack={() => 1}
        extra={[<AccessControl key="1" />, <SubscribeTicket key="2" />]}
      >
        <Descriptions size="small">
          <Descriptions.Item label="编号">
            <span className="text-[#AFAFAF]">#{nid}</span>
          </Descriptions.Item>
          <Descriptions.Item label="创建者">sdjdd</Descriptions.Item>
        </Descriptions>
      </PageHeader>

      <Row className="mt-4">
        <Col className="px-[15px]" span={24} md={6}>
          <div className="ant-form-vertical">
            <div className="pb-2">分类</div>
            <Select className="w-full" />
          </div>
        </Col>
        <Col className="px-[15px]" span={24} md={12}>
          <Timeline />
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
