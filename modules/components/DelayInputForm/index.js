import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FormControl } from 'react-bootstrap'
import PropTypes from 'prop-types'

/**
 * @param {object} props
 * @param {string} [props.value]
 * @param {Function} [props.onChange]
 * @param {number} [props.delay]
 * @param {string} [props.placeholder]
 */
export function DelayInputForm({ value = '', onChange, placeholder, delay = 1000 }) {
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

  return (
    <FormControl
      type="text"
      value={debouncedValue}
      placeholder={placeholder}
      onChange={handleChange}
    />
  )
}
DelayInputForm.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  delay: PropTypes.number,
  placeholder: PropTypes.string,
}
