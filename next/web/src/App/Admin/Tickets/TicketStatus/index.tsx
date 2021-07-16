import { ComponentPropsWithoutRef, FC } from 'react';
import cx from 'classnames';

function Base(props: ComponentPropsWithoutRef<'span'>) {
  return <span {...props} className={cx('text-xs px-1 py-0.5 border rounded', props.className)} />;
}

function New() {
  return <Base className="bg-green-50 text-green-500 border-green-500">新工单</Base>;
}

function WaitingOnStaffReply() {
  return <Base className="bg-yellow-50 text-yellow-500 border-yellow-500">等待客服回复</Base>;
}

function WaitingOnCustomerReply() {
  return <Base className="bg-blue-50 text-blue-500 border-blue-500">已回复用户</Base>;
}

function PreFulfilled() {
  return <Base className="bg-blue-50 text-blue-500 border-blue-500">待用户确认</Base>;
}

function Resolved() {
  return null;
}

function Unknown() {
  return <Base className="bg-gray-50 text-gray-500 border-gray-500">未知</Base>;
}

const components: Record<number, FC> = {
  50: New,
  120: WaitingOnStaffReply,
  160: WaitingOnCustomerReply,
  220: PreFulfilled,
  250: Resolved,
  280: Resolved,
};

export interface TicketStatusProps {
  status: number;
}

export function TicketStatus({ status }: TicketStatusProps) {
  const Component = components[status] ?? Unknown;
  return <Component />;
}
