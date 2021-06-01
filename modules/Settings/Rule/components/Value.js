import React, { useState } from 'react'
import { Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

import { Select } from './Select'

export function Value({ component, onChange, initValue }) {
  const [value, setValue] = useState(initValue || '')
  const handleChange = (value) => {
    setValue(value)
    onChange(component.reducer ? component.reducer(value) : value)
  }

  switch (component.type) {
    case 'select':
      return <Select options={component.options} value={value} onChange={handleChange} />
    case 'text':
      return <Form.Control value={value} onChange={(e) => handleChange(e.target.value)} />
    case 'number':
      return (
        <Form.Control
          type="number"
          min={component.min}
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
        />
      )
  }
  return null
}
Value.propTypes = {
  component: PropTypes.shape({
    type: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  initValue: PropTypes.any,
}
