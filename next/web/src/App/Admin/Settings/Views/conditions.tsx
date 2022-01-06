import { JSXElementConstructor } from 'react';

import { InputNumber } from '@/components/antd';
import {
  CategorySelect,
  CustomerServiceSelect,
  GroupSelect,
  StatusSelect,
} from '@/components/common';

interface ValueComponentProps {
  value: any;
  onChange: (value: any) => void;
}

export interface Op {
  label: string;
  value: string;
  component: JSXElementConstructor<ValueComponentProps>;
  componentProps?: Record<string, any>;
}

export interface Condition {
  label: string;
  value: string;
  ops: Op[];
}

const numberOps: Op[] = [
  {
    label: '小于',
    value: 'lt',
    component: InputNumber,
  },
  {
    label: '大于',
    value: 'gt',
    component: InputNumber,
  },
  {
    label: '是',
    value: 'is',
    component: InputNumber,
  },
];

export const conditions: Condition[] = [
  {
    label: '分类',
    value: 'categoryId',
    ops: [
      {
        label: '是',
        value: 'is',
        component: CategorySelect,
      },
      {
        label: '不是',
        value: 'isNot',
        component: CategorySelect,
      },
    ],
  },
  {
    label: '负责人',
    value: 'assigneeId',
    ops: [
      {
        label: '是',
        value: 'is',
        component: CustomerServiceSelect,
      },
      {
        label: '不是',
        value: 'isNot',
        component: CustomerServiceSelect,
      },
    ],
  },
  {
    label: '客服组',
    value: 'groupId',
    ops: [
      {
        label: '是',
        value: 'is',
        component: GroupSelect,
      },
      {
        label: '不是',
        value: 'isNot',
        component: GroupSelect,
      },
    ],
  },
  {
    label: '状态',
    value: 'status',
    ops: [
      {
        label: '是',
        value: 'is',
        component: StatusSelect,
      },
      {
        label: '不是',
        value: 'isNot',
        component: StatusSelect,
      },
    ],
  },
  {
    label: '自创建后数小时',
    value: 'sinceCreated',
    ops: numberOps,
  },
  {
    label: '自待处理后数小时',
    value: 'sinceNew',
    ops: numberOps,
  },
  {
    label: '自等待客服回复后数小时',
    value: 'sinceWaitingCustomerService',
    ops: numberOps,
  },
  {
    label: '自等待用户回复后数小时',
    value: 'sinceWaitingCustomer',
    ops: numberOps,
  },
  {
    label: '自待确认解决后数小时',
    value: 'sincePreFulfilled',
    ops: numberOps,
  },
  {
    label: '自已解决后数小时',
    value: 'sinceFulfilled',
    ops: numberOps,
  },
];
