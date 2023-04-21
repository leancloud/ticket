import { StringValue } from '../../conditions/StringValue';
import { CategoryId } from '../../conditions/CategoryId';
import { AuthorId } from '../../conditions/AuthorId';
import { AssigneeId } from '../../conditions/AssigneeId';
import { GroupId } from '../../conditions/GroupId';
import { Status } from '../../conditions/Status';
import { NumberValue } from '../../conditions/NumberValue';
import { MetaData } from '../../conditions/MetaData';
import { Language } from '../../conditions/Language';

export default {
  title: {
    label: '标题',
    component: StringValue,
  },
  content: {
    label: '描述',
    component: StringValue,
  },
  categoryId: {
    label: '分类',
    component: CategoryId,
  },
  authorId: {
    label: '创建者',
    component: AuthorId,
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
  sinceCreated: {
    label: '小时数-自工单创建开始',
    component: NumberValue,
  },
  sinceUpdated: {
    label: '小时数-自工单更新开始',
    component: NumberValue,
  },
  sinceAssigned: {
    label: '小时数-自工单被分配负责人开始',
    component: NumberValue,
  },
  metaData: {
    label: 'metaData',
    component: MetaData,
  },
  language: {
    label: '工单语言',
    component: Language,
  },
};
