import { UpdateCategoryId } from '../../actions/UpdateCategoryId';
import { UpdateAssigneeId } from '../../actions/UpdateAssigneeId';
import { UpdateGroupId } from '../../actions/UpdateGroupId';
import { TagSelect } from '../../components/TagSelect';
import { ChangeStatus } from '../../actions/ChangeStatus';

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
  changeStatus: {
    label: '变更状态',
    component: ChangeStatus,
  },
  closeTicket: {
    label: '关闭工单（已废弃）',
  },
  addTag: {
    label: '设置标签',
    component: TagSelect,
  },
};
