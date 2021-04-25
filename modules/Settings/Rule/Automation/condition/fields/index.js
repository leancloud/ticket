export { assigneeId, status, title, content } from '../../../Condition/fields'

export const createdAt = {
  title: 'Hours since created',
  operators: {
    lessThan: {
      title: 'Less than',
      component: {
        type: 'number',
        min: 0,
      },
    },
    greaterThan: {
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

export const updatedAt = {
  title: 'Hours since updated',
  operators: {
    lessThan: {
      title: 'Less than',
      component: {
        type: 'number',
        min: 0,
      },
    },
    greaterThan: {
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
