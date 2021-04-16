import React, { useEffect, useState } from 'react'
import { Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

/**
 *
 * @param {object} props
 * @param {Function} props.onChange
 * @param {string} [props.initValue]
 */
export function TextInput({ initValue, onChange }) {
  const [value, setValue] = useState(initValue || '')
  useEffect(() => {
    onChange(value)
  }, [value])
  return <Form.Control value={value} onChange={(e) => setValue(e.target.value)} />
}
TextInput.propTypes = {
  initValue: PropTypes.string,
  onChange: PropTypes.func.isRequired,
}
