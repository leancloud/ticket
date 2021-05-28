import React from 'react'
import { Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

/**
 * @param {object} props
 * @param {{title: string; value: string | number;}[]} props.options
 * @param {(value: string) => void} props.onChange
 * @param {string | number} [props.value]
 */
export function Select({ options, value, onChange }) {
  return (
    <Form.Control as="select" value={value} onChange={(e) => onChange(e.target.value)}>
      {!value && <option></option>}
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
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
}
