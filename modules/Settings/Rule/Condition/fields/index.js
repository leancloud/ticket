import { AssigneeSelect } from '../../components/AssigneeSelect'

export default {
  updateType: {
    title: 'Ticket',
    operators: {
      is: {
        title: 'Is',
        component: {
          type: 'select',
          options: [
            {
              title: 'Created',
              value: 'create',
            },
            {
              title: 'Updated',
              value: 'update',
            },
          ],
        },
      },
    },
  },
  assigneeId: {
    title: 'Assignee',
    operators: {
      is: {
        title: 'Is',
        component: AssigneeSelect,
      },
    },
  },
}
