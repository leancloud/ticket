import React, { useCallback, useRef, useState } from 'react'
import { Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

/**
 * @param {object} props
 * @param {string} [props.initValue]
 * @param {Function} [props.onChange]
 * @param {number} [props.delay]
 */
export function DelayInputForm({ initValue, onChange, delay, ...props }) {
  const [value, setValue] = useState(initValue || '')
  const $delay = useRef(delay ?? 1000)
  const $onChange = useRef(onChange)
  $onChange.current = onChange

  const $timer = useRef()
  const handleChange = useCallback((e) => {
    const value = e.target.value
    setValue(value)
    clearTimeout($timer.current)
    $timer.current = setTimeout(() => $onChange.current?.(value), $delay.current)
  }, [])

  return <Form.Control {...props} value={value} onChange={handleChange} />
}
DelayInputForm.propTypes = {
  initValue: PropTypes.string,
  onChange: PropTypes.func,
  delay: PropTypes.number,
}
