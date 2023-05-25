import { Config } from '../../Automations/components/TriggerForm/CustomField';
import { CategoryId } from '../../Automations/conditions/CategoryId';
import { AssigneeId } from './AssigneeId';
import { GroupId } from './GroupId';
import { Status } from '../../Automations/conditions/Status';
import { Tags } from '../../Automations/conditions/Tags';
import { Language } from '../../Automations/conditions/Language';
import { NumberValue } from '../../Automations/conditions/NumberValue';

export const conditions: Config = {
  categoryId: {
    label: '分类',
    component: CategoryId,
  },
  assigneeId: {
    label: '负责人',
    component: AssigneeId,
  },
  groupId: {
    label: '客服组',
    component: GroupId,
  },
  status: {
    label: '状态',
    component: Status,
  },
  tags: {
    label: '标签',
    component: Tags,
  },
  language: {
    label: '工单语言',
    component: Language,
  },
  sinceCreated: {
    label: '自创建后数小时',
    component: NumberValue,
  },
  sinceNew: {
    label: '自待处理后数小时',
    component: NumberValue,
  },
  sinceWaitingCustomerService: {
    label: '自等待客服回复后数小时',
    component: NumberValue,
  },
  sinceWaitingCustomer: {
    label: '自等待用户回复后数小时',
    component: NumberValue,
  },
  sincePreFulfilled: {
    label: '自待确认解决后数小时',
    component: NumberValue,
  },
  sinceFulfilled: {
    label: '自已解决后数小时',
    component: NumberValue,
  },
};
