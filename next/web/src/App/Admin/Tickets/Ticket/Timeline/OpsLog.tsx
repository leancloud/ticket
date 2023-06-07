import { ComponentProps, ReactNode, useMemo } from 'react';
import {
  AiOutlineSwap,
  AiOutlineTeam,
  AiOutlineEdit,
  AiOutlineArrowRight,
  AiOutlineSmile,
  AiOutlineClockCircle,
  AiOutlineCheckCircle,
  AiOutlineReload,
  AiOutlineStop,
} from 'react-icons/ai';
import { keyBy } from 'lodash-es';
import cx from 'classnames';

import { OpsLog as OpsLogSchema } from '@/api/ticket';
import { useUser } from '@/api/user';
import { useGroup } from '@/api/group';
import { useCategories } from '@/api/category';
import { Button, Spin, Tag } from '@/components/antd';
import { UserLabel } from '@/App/Admin/components';
import { useModal } from '../components/useModal';
import { useTicketFields_v1 } from '../api1';
import { Time } from './Time';

interface OpsLogProps {
  data: OpsLogSchema;
}

export function OpsLog({ data }: OpsLogProps) {
  switch (data.action) {
    case 'selectAssignee':
      return <SelectAssignee assigneeId={data.assigneeId} time={data.createdAt} />;
    case 'changeAssignee':
      return (
        <ChangeAssignee
          assigneeId={data.assigneeId}
          operatorId={data.operatorId}
          time={data.createdAt}
        />
      );
    case 'changeGroup':
      return (
        <ChangeGroup operatorId={data.operatorId} groupId={data.groupId} time={data.createdAt} />
      );
    case 'changeCategory':
      return (
        <ChangeCategory
          operatorId={data.operatorId}
          categoryId={data.categoryId}
          time={data.createdAt}
        />
      );
    case 'changeFields':
      return (
        <ChangeFields operatorId={data.operatorId} changes={data.changes} time={data.createdAt} />
      );
    case 'replyWithNoContent':
      return <ReplyWithNoContent operatorId={data.operatorId} time={data.createdAt} />;
    case 'replySoon':
      return <ReplySoon operatorId={data.operatorId} time={data.createdAt} />;
    case 'resolve':
      return <Resolve operatorId={data.operatorId} time={data.createdAt} />;
    case 'reject':
    case 'close':
      return <Close operatorId={data.operatorId} time={data.createdAt} />;
    case 'reopen':
      return <Reopen operatorId={data.operatorId} time={data.createdAt} />;
  }
}

interface AsyncUserLabelProps {
  userId: string;
}

function AsyncUserLabel({ userId }: AsyncUserLabelProps) {
  const { data: user } = useUser(userId, {
    enabled: userId !== 'system',
    staleTime: Infinity,
  });

  if (userId === 'system') {
    return <div>系统</div>;
  }
  if (!user) {
    return <div>Loading...</div>;
  }
  return <UserLabel user={user} />;
}

interface BaseOpsLogProps {
  icon: ReactNode;
  children: ReactNode;
  time: string;
}

function BaseOpsLog({ icon, children, time }: BaseOpsLogProps) {
  return (
    <div className="grid grid-cols-[30px_1fr] items-center ml-[26px] mb-5">
      {icon}
      <div className="ml-2 flex flex-wrap items-center gap-1">
        {children}
        <div>
          (<Time value={time} />)
        </div>
      </div>
    </div>
  );
}

function Circle(props: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cx(
        'rounded-full w-[30px] h-[30px] flex justify-center items-center',
        props.className
      )}
    />
  );
}

interface SelectAssigneeProps {
  assigneeId: string;
  time: string;
}

function SelectAssignee({ assigneeId, time }: SelectAssigneeProps) {
  return (
    <BaseOpsLog
      icon={
        <Circle className="bg-[#efefef]">
          <AiOutlineSwap className="w-4 h-4" />
        </Circle>
      }
      time={time}
    >
      <span>系统将工单分配给</span>
      <AsyncUserLabel userId={assigneeId} />
    </BaseOpsLog>
  );
}

interface ChangeAssigneeProps {
  operatorId: string;
  assigneeId?: string;
  time: string;
}

function ChangeAssignee({ assigneeId, operatorId, time }: ChangeAssigneeProps) {
  return (
    <BaseOpsLog
      icon={
        <Circle className="bg-[#efefef]">
          <AiOutlineSwap className="w-4 h-4" />
        </Circle>
      }
      time={time}
    >
      <AsyncUserLabel userId={operatorId} />
      <span>将负责人修改为</span>
      {assigneeId ? <AsyncUserLabel userId={assigneeId} /> : <span>(未分配)</span>}
    </BaseOpsLog>
  );
}

interface ChangeGroupProps {
  operatorId: string;
  groupId?: string;
  time: string;
}

function ChangeGroup({ operatorId, groupId, time }: ChangeGroupProps) {
  return (
    <BaseOpsLog
      icon={
        <Circle className="bg-[#efefef]">
          <AiOutlineTeam className="w-4 h-4" />
        </Circle>
      }
      time={time}
    >
      <AsyncUserLabel userId={operatorId} />
      <span>将客服组修改为</span>
      {groupId ? <GroupLabel groupId={groupId} /> : <span>(未分配)</span>}
    </BaseOpsLog>
  );
}

interface GroupLabelProps {
  groupId: string;
}

function GroupLabel({ groupId }: GroupLabelProps) {
  const { data: group } = useGroup(groupId);

  if (!group) {
    return <div>Loading...</div>;
  }
  return <div>{group.name}</div>;
}

interface ChangeCategoryProps {
  operatorId: string;
  categoryId: string;
  time: string;
}

function ChangeCategory({ operatorId, categoryId, time }: ChangeCategoryProps) {
  const { data: categories, isLoading } = useCategories();

  const categoryById = useMemo(() => keyBy(categories, (c) => c.id), [categories]);

  const fullname = useMemo(() => {
    let current = categoryById[categoryId];
    const path: string[] = [];
    while (current) {
      path.push(current.name);
      if (current.parentId) {
        current = categoryById[current.parentId];
      } else {
        break;
      }
    }
    return path.reverse().join(' / ');
  }, [categoryById, categoryId]);

  return (
    <BaseOpsLog
      icon={
        <Circle className="bg-[#efefef]">
          <AiOutlineSwap className="w-4 h-4" />
        </Circle>
      }
      time={time}
    >
      <AsyncUserLabel userId={operatorId} />
      <span>将分类修改为</span>
      <Tag>{isLoading ? 'Loading...' : fullname}</Tag>
    </BaseOpsLog>
  );
}

interface ChangeFieldsProps {
  operatorId: string;
  changes: { fieldId: string; from: any; to: any }[];
  time: string;
}

function ChangeFields({ operatorId, changes, time }: ChangeFieldsProps) {
  const { modal, toggle } = useModal({
    props: {
      title: '字段修改记录',
    },
    render: () => <DiffFields changes={changes} />,
  });

  return (
    <BaseOpsLog
      icon={
        <Circle className="bg-[#efefef]">
          <AiOutlineEdit className="w-4 h-4" />
        </Circle>
      }
      time={time}
    >
      <AsyncUserLabel userId={operatorId} />
      <span>修改字段</span>
      <Button size="small" onClick={toggle}>
        查看
      </Button>
      {modal}
    </BaseOpsLog>
  );
}

interface DiffFieldsProps {
  changes: { fieldId: string; from: any; to: any }[];
}

function DiffFields({ changes }: DiffFieldsProps) {
  const fileIds = useMemo(() => changes.map((c) => c.fieldId), [changes]);
  const { data: fields } = useTicketFields_v1(fileIds);
  const fieldById = useMemo(() => keyBy(fields, (f) => f.id), [fields]);

  if (!fields) {
    return (
      <div className="h-20 flex justify-center items-center">
        <Spin />
      </div>
    );
  }

  return (changes.map(({ fieldId, from, to }) => {
    const field = fieldById[fieldId];
    if (!field) {
      return null;
    }

    return (
      <DiffField
        fieldName={field.variants[0]?.title}
        options={field.variants[0]?.options}
        from={from}
        to={to}
      />
    );
  }) as any) as JSX.Element;
}

interface DiffFieldProps {
  fieldName?: string;
  options?: [string, string][];
  from: any;
  to: any;
}

function DiffField({ fieldName, from, to, options }: DiffFieldProps) {
  return (
    <div className="mb-4">
      <div className="font-bold mb-2">{fieldName ?? '未知'}</div>
      <div className="flex items-center gap-2 flex-wrap ml-2">
        <del>
          <FieldValue value={from} options={options} />
        </del>
        <AiOutlineArrowRight />
        <FieldValue value={to} options={options} />
      </div>
    </div>
  );
}

interface FieldValueProps {
  value: any;
  options?: [string, string][];
}

function FieldValue({ value, options }: FieldValueProps) {
  const displayValue = useMemo(() => {
    if (Array.isArray(value)) {
      let arr = value.filter((v) => typeof v === 'string');
      if (options) {
        arr = arr.map((v) => options.find((o) => o[0] === v)?.[1] ?? v);
      }
      return arr.join(' , ');
    }
    if (typeof value === 'string') {
      if (options) {
        return options.find((o) => o[0] === value)?.[1] ?? value;
      }
      return value;
    }
    return null;
  }, [value, options]);

  return <div className="text-primary">{displayValue}</div>;
}

interface ActionOpsLogProps {
  operatorId: string;
  time: string;
}

function ReplyWithNoContent({ operatorId, time }: ActionOpsLogProps) {
  return (
    <BaseOpsLog
      icon={
        <Circle className="bg-[#efefef]">
          <AiOutlineSmile className="w-4 h-4" />
        </Circle>
      }
      time={time}
    >
      <AsyncUserLabel userId={operatorId} />
      <span>认为该工单暂时无需回复，如有问题可以回复该工单</span>
    </BaseOpsLog>
  );
}

function ReplySoon({ operatorId, time }: ActionOpsLogProps) {
  return (
    <BaseOpsLog
      icon={
        <Circle className="bg-[#ffb741]">
          <AiOutlineClockCircle className="w-4 h-4 text-white" />
        </Circle>
      }
      time={time}
    >
      <AsyncUserLabel userId={operatorId} />
      <span>认为该工单处理需要一些时间，稍后会回复该工单</span>
    </BaseOpsLog>
  );
}

function Close({ operatorId, time }: ActionOpsLogProps) {
  return (
    <BaseOpsLog
      icon={
        <Circle className="bg-[#ff3d3d]">
          <AiOutlineStop className="w-4 h-4 text-white" />
        </Circle>
      }
      time={time}
    >
      <AsyncUserLabel userId={operatorId} />
      <span>关闭了该工单</span>
    </BaseOpsLog>
  );
}

function Resolve({ operatorId, time }: ActionOpsLogProps) {
  return (
    <BaseOpsLog
      icon={
        <Circle className="bg-[#33c371]">
          <AiOutlineCheckCircle className="w-4 h-4 text-white" />
        </Circle>
      }
      time={time}
    >
      <AsyncUserLabel userId={operatorId} />
      <span>认为该工单已经解决</span>
    </BaseOpsLog>
  );
}

function Reopen({ operatorId, time }: ActionOpsLogProps) {
  return (
    <BaseOpsLog
      icon={
        <Circle className="bg-[#359cf7]">
          <AiOutlineReload className="w-4 h-4 text-white" />
        </Circle>
      }
      time={time}
    >
      <AsyncUserLabel userId={operatorId} />
      <span>重新打开该工单</span>
    </BaseOpsLog>
  );
}
