import React, { useEffect, useState } from 'react'
import { Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

/**
 *
 * @param {object} props
 * @param {Array<{title: string, value: string | number}>} props.options
 * @param {Function} props.onChange
 * @param {string | number} [props.initValue]
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
      value: PropTypes.oneOf(PropTypes.string, PropTypes.number),
    })
  ).isRequired,
  initValue: PropTypes.oneOf(PropTypes.string, PropTypes.number),
  onChange: PropTypes.func.isRequired,
}
