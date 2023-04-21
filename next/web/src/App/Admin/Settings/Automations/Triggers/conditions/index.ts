import { StringValue } from '../../conditions/StringValue';
import { CategoryId } from '../../conditions/CategoryId';
import { GroupId } from '../../conditions/GroupId';
import { Status } from '../../conditions/Status';
import { MetaData } from '../../conditions/MetaData';
import { Tags } from '../../conditions/Tags';

import { Ticket } from './Ticket';
import { AuthorId } from './AuthorId';
import { AssigneeId } from './AssigneeId';
import { CurrentUserId } from './CurrentUserId';
import { Language } from '../../conditions/Language';

export default {
  ticket: {
    label: '工单',
    component: Ticket,
  },
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
  currentUserId: {
    label: '当前用户',
    component: CurrentUserId,
  },
  metaData: {
    label: 'metaData',
    component: MetaData,
  },
  tags: {
    label: '标签',
    component: Tags,
  },
  replyContent: {
    label: '回复内容',
    component: StringValue,
  },
  language: {
    label: '工单语言',
    component: Language,
  },
};
