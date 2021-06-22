import { AssigneeSelect } from '../../components/AssigneeSelect'
import { TICKET_STATUS } from '../../../../../lib/common'

export const update_type = {
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
}

export const assignee_id = {
  title: 'Assignee',
  operators: {
    is: {
      title: 'Is',
      component: AssigneeSelect,
    },
    is_not: {
      title: 'Is not',
      component: AssigneeSelect,
    },
  },
}

export const status = {
  title: 'Status',
  operators: {
    is: {
      title: 'Is',
      component: {
        type: 'select',
        options: [
          {
            title: 'New',
            value: TICKET_STATUS.NEW,
          },
          {
            title: 'Waiting on staff reply',
            value: TICKET_STATUS.WAITING_CUSTOMER_SERVICE,
          },
          {
            title: 'Waiting on customer reply',
            value: TICKET_STATUS.WAITING_CUSTOMER,
          },
          {
            title: 'Waiting on confirming resolved',
            value: TICKET_STATUS.PRE_FULFILLED,
          },
          {
            title: 'Resolved',
            value: TICKET_STATUS.FULFILLED,
          },
          {
            title: 'Closed',
            value: TICKET_STATUS.CLOSED,
          },
        ],
        reducer: (value) => parseInt(value),
      },
    },
  },
}

export const title = {
  title: 'Title',
  operators: {
    contains: {
      title: 'Contains',
      component: {
        type: 'text',
      },
    },
    not_contains: {
      title: 'Does not contain',
      component: {
        type: 'text',
      },
    },
  },
}

export const content = {
  title: 'Content',
  operators: {
    contains: {
      title: 'Contains',
      component: {
        type: 'text',
      },
    },
    not_contains: {
      title: 'Does not contain',
      component: {
        type: 'text',
      },
    },
  },
}

export const latest_reply = {
  title: 'Latest reply',
  operators: {
    updated: {
      title: 'Updated',
    },
  },
}

export const current_user = {
  title: 'Current user',
  operators: {
    is: {
      title: 'Is',
      component: {
        type: 'select',
        options: [
          {
            title: '(Staff)',
            value: '(customer service)',
          },
        ],
      },
    },
    is_not: {
      title: 'Is not',
      component: {
        type: 'select',
        options: [
          {
            title: '(Staff)',
            value: '(customer service)',
          },
        ],
      },
    },
  },
}
