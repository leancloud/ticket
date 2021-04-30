import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

/**
 * @param {object} props
 * @param {string} [props.value]
 * @param {Function} [props.onChange]
 * @param {number} [props.delay]
 */
export function DelayInputForm({ value = '', onChange, delay = 1000, ...props }) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  const $onChange = useRef(onChange)
  useEffect(() => {
    $onChange.current = onChange
  }, [onChange])
  const $delay = useRef(delay)
  useEffect(() => {
    $delay.current = delay
  }, [delay])

  useEffect(() => {
    const timer = setTimeout(() => {
      $onChange.current?.(debouncedValue)
    }, $delay.current)
    return () => clearTimeout(timer)
  }, [debouncedValue])

  const handleChange = useCallback(
    (e) => {
      setDebouncedValue(e.target.value)
    },
    [setDebouncedValue]
  )

  return <Form.Control {...props} value={debouncedValue} onChange={handleChange} />
}
DelayInputForm.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  delay: PropTypes.number,
}
