import { UpdateCategoryId } from '../../actions/UpdateCategoryId';
import { UpdateGroupId } from '../../actions/UpdateGroupId';
import { TagSelect } from '../../components/TagSelect';

import { UpdateAssigneeId } from './UpdateAssigneeId';

export default {
  updateAssigneeId: {
    label: '将负责人更新为',
    component: UpdateAssigneeId,
  },
  updateCategoryId: {
    label: '将分类更新为',
    component: UpdateCategoryId,
  },
  updateGroupId: {
    label: '将客服组更新为',
    component: UpdateGroupId,
  },
  closeTicket: {
    label: '关闭工单',
  },
  addTag: {
    label: '添加标签',
    component: TagSelect,
  },
};
