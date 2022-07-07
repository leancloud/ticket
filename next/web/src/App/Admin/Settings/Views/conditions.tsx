import { JSXElementConstructor } from 'react';

import { InputNumber } from '@/components/antd';
import {
  CategorySelect,
  SingleCustomerServiceSelect,
  SingleGroupSelect,
  StatusSelect,
} from '@/components/common';
import { TagSelect } from './components/TagSelect';

interface ValueComponentProps {
  value: any;
  onChange: (value: any) => void;
}

interface Op {
  label: string;
  value: string;
  component?: JSXElementConstructor<ValueComponentProps>;
  componentProps?: Record<string, any>;
  hookComponent?: JSXElementConstructor<{ name: string }>;
}

interface Condition {
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

const currentUserOption = {
  label: '（当前用户）',
  value: '__currentUser',
};

const groupsOfCurrentUserOption = {
  label: '（当前用户的组）',
  value: '__groupsOfCurrentUser',
};

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
        component: SingleCustomerServiceSelect,
        componentProps: {
          options: [currentUserOption],
          includeNull: true,
        },
      },
      {
        label: '不是',
        value: 'isNot',
        component: SingleCustomerServiceSelect,
        componentProps: {
          options: [currentUserOption],
          includeNull: true,
        },
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
        component: SingleGroupSelect,
        componentProps: {
          options: [groupsOfCurrentUserOption],
          includeNull: true,
        },
      },
      {
        label: '不是',
        value: 'isNot',
        component: SingleGroupSelect,
        componentProps: {
          options: [groupsOfCurrentUserOption],
          includeNull: true,
        },
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
    label: '标签',
    value: 'tags',
    ops: [
      {
        label: '包含',
        value: 'contains',
        hookComponent: TagSelect,
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
