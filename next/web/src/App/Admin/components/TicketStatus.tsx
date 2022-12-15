import { ComponentPropsWithoutRef, FC } from 'react';
import cx from 'classnames';

function Base(props: ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      {...props}
      className={cx('p-1 text-sm border rounded whitespace-nowrap', props.className)}
    />
  );
}

function New() {
  return <Base className="bg-red-50 text-red-500 border-red-200">新工单</Base>;
}

function WaitingOnStaffReply() {
  return <Base className="bg-yellow-50 text-yellow-500 border-yellow-200">待客服回复</Base>;
}

function WaitingOnCustomerReply() {
  return <Base className="bg-blue-50 text-blue-500 border-blue-200">已回复用户</Base>;
}

function PreFulfilled() {
  return <Base className="bg-cyan-50 text-cyan-500 border-cyan-200">待用户确认</Base>;
}

function Resolved() {
  return <Base className="bg-gray-50 text-gray-500 border-gray-200">已关闭</Base>;
}

function Unknown() {
  return <Base className="bg-zinc-50 text-zinc-500 border-zinc-200">未知</Base>;
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
