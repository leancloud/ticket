import { TICKET_ACTION } from '../../../../../lib/common'
import { AssigneeSelect } from '../../components/AssigneeSelect'

export const update_assignee_id = {
  title: 'Change assignee',
  component: AssigneeSelect,
}

export const operate = {
  title: 'Operate ticket',
  component: {
    type: 'select',
    options: [
      {
        title: 'Close',
        value: TICKET_ACTION.CLOSE,
      },
    ],
  },
}
