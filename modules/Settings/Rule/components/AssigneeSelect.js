import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

import { getUserDisplayName } from '../../../../lib/common'
import { Context } from '../context'

export function AssigneeSelect({ initValue, onChange }) {
  const [value, setValue] = useState(initValue || '')
  const { assignees } = useContext(Context)
  const invalid = useMemo(() => {
    return value && assignees.findIndex(({ objectId }) => objectId === value) === -1
  }, [assignees, value])

  useEffect(() => {
    if (invalid || !value) {
      onChange(undefined)
      return
    }
    onChange(value)
  }, [value, invalid])

  return (
    <Form.Control
      as="select"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      isInvalid={invalid}
    >
      <option value=""></option>
      {invalid && <option value={value}>{value}</option>}
      {assignees.map((assignee) => (
        <option key={assignee.objectId} value={assignee.objectId}>
          {getUserDisplayName(assignee)}
        </option>
      ))}
    </Form.Control>
  )
}
AssigneeSelect.propTypes = {
  initValue: PropTypes.string,
  onChange: PropTypes.func.isRequired,
}
