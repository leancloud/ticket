import React from 'react'
import { Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

/**
 * @param {object} props
 * @param {Record<string, { title: string }>} props.map
 * @param {string} props.value
 * @param {Function} props.onChange
 */
export function MapSelect({ map, value, onChange }) {
  return (
    <Form.Control as="select" value={value} onChange={(e) => onChange(e.target.value)}>
      {!value && <option></option>}
      {Object.entries(map).map(([key, { title }]) => (
        <option key={key} value={key}>
          {title}
        </option>
      ))}
    </Form.Control>
  )
}
MapSelect.propTypes = {
  map: PropTypes.objectOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
    })
  ).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
}
