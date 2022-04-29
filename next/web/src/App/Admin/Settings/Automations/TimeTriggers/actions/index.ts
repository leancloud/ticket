import { UpdateCategoryId } from '../../actions/UpdateCategoryId';
import { UpdateAssigneeId } from '../../actions/UpdateAssigneeId';
import { UpdateGroupId } from '../../actions/UpdateGroupId';
import { TagSelect } from '../../components/TagSelect';

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
  removeTag: {
    label: '删除标签',
    component: TagSelect,
  },
};
