export { assignee_id, status, title, content } from '../../../Condition/fields'

export const created_at = {
  title: 'Hours since created',
  operators: {
    less_than: {
      title: 'Less than',
      component: {
        type: 'number',
        min: 0,
      },
    },
    greater_than: {
      title: 'Greater than',
      component: {
        type: 'number',
        min: 0,
      },
    },
    is: {
      title: 'Is',
      component: {
        type: 'number',
        min: 0,
      },
    },
  },
}

export const updated_at = {
  title: 'Hours since updated',
  operators: {
    less_than: {
      title: 'Less than',
      component: {
        type: 'number',
        min: 0,
      },
    },
    greater_than: {
      title: 'Greater than',
      component: {
        type: 'number',
        min: 0,
      },
    },
    is: {
      title: 'Is',
      component: {
        type: 'number',
        min: 0,
      },
    },
  },
}
