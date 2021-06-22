import React, { useContext, useEffect, useState } from 'react'
import { Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

import { getUserDisplayName } from '../../../../lib/common'
import { Context } from '../context'

export function AssigneeSelect({ onChange, initValue }) {
  const { assignees } = useContext(Context)
  const [value, setValue] = useState(initValue || '')
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    setInvalid(false)
    if (!assignees) {
      return
    }
    if (value && value !== '(current user)') {
      if (assignees.findIndex((a) => a.objectId === value) === -1) {
        setInvalid(true)
        onChange(undefined)
        return
      }
    }
    onChange(value)
  }, [onChange, assignees, value])

  return (
    <Form.Control
      as="select"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      isInvalid={invalid}
      disabled={!assignees}
    >
      {assignees ? (
        <>
          <option value="">(Empty)</option>
          <option value="(current user)">(Current user)</option>
          <option disabled>---</option>
          {assignees.map((assignee) => (
            <option key={assignee.objectId} value={assignee.objectId}>
              {getUserDisplayName(assignee)}
            </option>
          ))}
        </>
      ) : (
        <option>Loading...</option>
      )}
    </Form.Control>
  )
}
AssigneeSelect.propTypes = {
  onChange: PropTypes.func.isRequired,
  initValue: PropTypes.string,
}
