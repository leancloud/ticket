import React, { useEffect, useState } from 'react'
import { Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

/**
 *
 * @param {object} props
 * @param {Array<{title: string, value: string}>} props.options
 * @param {Function} props.onChange
 * @param {string} [props.initValue]
 */
export function Select({ options, initValue, onChange }) {
  const [value, setValue] = useState(initValue || options[0].value)
  useEffect(() => {
    onChange(value)
  }, [value])
  return (
    <Form.Control as="select" value={value} onChange={(e) => setValue(e.target.value)}>
      {options.map(({ title, value }) => (
        <option key={value} value={value}>
          {title}
        </option>
      ))}
    </Form.Control>
  )
}
Select.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string,
      value: PropTypes.string,
    })
  ).isRequired,
  initValue: PropTypes.string,
  onChange: PropTypes.func.isRequired,
}
