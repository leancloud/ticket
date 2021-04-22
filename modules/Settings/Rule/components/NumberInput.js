import React, { useEffect, useState } from 'react'
import { Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

export function NumberInput({ initValue, onChange, min }) {
  const [value, setValue] = useState(initValue || 0)
  useEffect(() => {
    onChange(value)
  }, [value])
  return (
    <Form.Control
      type="number"
      min={min}
      value={value}
      onChange={(e) => setValue(Number(e.target.value))}
    />
  )
}
NumberInput.propTypes = {
  initValue: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  min: PropTypes.number,
}
