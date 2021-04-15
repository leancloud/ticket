import React from 'react'
import { Col, Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

import { AssigneeSelect } from '../../components/AssigneeSelect'

function UpdateAssigneeId({ typeSelector, initData, onChange }) {
  const handleChangeValue = (value) => {
    if (value) {
      onChange?.({ type: 'updateAssigneeId', value })
    } else {
      onChange?.(null)
    }
  }
  return (
    <Form.Row>
      <Form.Group className="my-0" as={Col}>
        {typeSelector}
      </Form.Group>
      <Form.Group className="my-0" as={Col}>
        <AssigneeSelect initValue={initData?.value} onChange={handleChangeValue} />
      </Form.Group>
    </Form.Row>
  )
}
UpdateAssigneeId.propTypes = {
  typeSelector: PropTypes.element,
  initData: PropTypes.object,
  onChange: PropTypes.func,
}

export default {
  updateAssigneeId: {
    title: 'Assignee',
    component: AssigneeSelect,
  },
}
