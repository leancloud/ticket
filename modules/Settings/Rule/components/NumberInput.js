import React, { useEffect, useState } from 'react'
import { Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

export function NumberInput({ initValue, onChange, props }) {
  const [value, setValue] = useState(initValue || 0)
  useEffect(() => {
    onChange(value)
  }, [value])
  return (
    <Form.Control
      {...props}
      type="number"
      value={value}
      onChange={(e) => setValue(Number(e.target.value))}
    />
  )
}
NumberInput.propTypes = {
  initValue: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  props: PropTypes.object,
}
