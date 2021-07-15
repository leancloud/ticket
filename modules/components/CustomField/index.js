import React, { memo, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Form } from 'react-bootstrap'
import _ from 'lodash'
import Select, { MultiSelect } from 'modules/components/Select'
import { RadioGroup, NativeRadio } from 'modules/components/Radio'
import styles from './index.module.scss'

export const includeOptionsType = ['dropdown', 'multi-select', 'radios']
export const fieldType = ['text', 'multi-line', 'checkbox', 'dropdown', 'multi-select', 'radios']
const Text = memo(
  ({
    id = _.uniqueId('Text'),
    label,
    value,
    onChange,
    disabled,
    readOnly,
    required,
    className,
    size,
  }) => {
    return (
      <Form.Group className={className}>
        {label && <Form.Label htmlFor={id}>{label}</Form.Label>}
        <Form.Control
          id={id}
          size={size}
          disabled={disabled}
          readOnly={readOnly}
          value={value || ''}
          onChange={(e) => {
            if (onChange) {
              const v = e.target.value
              onChange(v)
            }
          }}
          required={required}
        />
      </Form.Group>
    )
  }
)
const MultiLine = memo(
  ({
    id = _.uniqueId('MultiLine'),
    label,
    value,
    onChange,
    disabled,
    readOnly,
    required,
    className,
    size,
  }) => {
    return (
      <Form.Group className={className}>
        {label && <Form.Label htmlFor={id}>{label}</Form.Label>}
        <Form.Control
          size={size}
          id={id}
          as="textarea"
          rows={3}
          disabled={disabled}
          readOnly={readOnly}
          value={value || ''}
          onChange={(e) => {
            if (onChange) {
              const v = e.target.value
              onChange(v)
            }
          }}
          required={required}
        />
      </Form.Group>
    )
  }
)
const Checkbox = memo(
  ({
    id = _.uniqueId('Checkbox'),
    label,
    disabled,
    onChange,
    value,
    required,
    readOnly,
    className,
  }) => {
    return (
      <Form.Group className={className}>
        <Form.Check type="checkbox">
          <Form.Check.Input
            id={id}
            disabled={disabled}
            checked={value || false}
            readOnly={readOnly}
            onChange={(e) => {
              if (onChange) {
                const { checked } = e.target
                onChange(checked)
              }
            }}
            required={required}
          />
          <Form.Check.Label htmlFor={id}>{label || ' '}</Form.Check.Label>
        </Form.Check>
      </Form.Group>
    )
  }
)
const defaultPlaceholder = ''
const getDisplayText = (options, value) => {
  if (!options) {
    return value
  }
  let result = value
  options.some((v) => {
    if (Array.isArray(v) && v[0] === value) {
      result = v[1]
      return true
    } else {
      if (v === value) {
        result = v
        return true
      }
    }
    return false
  })
  return result
}
const Dropdown = memo(
  ({
    id = _.uniqueId('Dropdown'),
    size,
    label,
    readOnly,
    disabled,
    options,
    className,
    ...rest
  }) => {
    const displayMode = readOnly || disabled
    return (
      <Form.Group className={className}>
        {label && <Form.Label htmlFor={id}>{label}</Form.Label>}
        {displayMode && (
          <Form.Control
            size={size}
            readOnly={readOnly}
            disabled={disabled}
            value={getDisplayText(options, rest.value)}
          />
        )}
        {!displayMode && (
          <Select
            id={id}
            size={size}
            placeholder={defaultPlaceholder}
            options={options}
            {...rest}
          />
        )}
      </Form.Group>
    )
  }
)

const MultiSelectField = memo(
  ({
    id = _.uniqueId('MultiSelect'),
    label,
    onChange,
    value,
    disabled,
    required,
    options,
    readOnly,
    className,
  }) => {
    const reOptions = useMemo(() => {
      if (!options) {
        return []
      }
      return options.map(([v, title]) => ({
        label: title,
        value: v,
        disabled: disabled || readOnly,
      }))
    }, [options, readOnly, disabled])
    return (
      <Form.Group className={className}>
        {label && <Form.Label htmlFor={id}>{label}</Form.Label>}
        <MultiSelect
          options={reOptions}
          required={required}
          name={id}
          values={value}
          onChange={onChange}
          className={styles.optionItem}
        />
      </Form.Group>
    )
  }
)

const Radios = memo(
  ({
    id = _.uniqueId('Checkbox'),
    label,
    disabled,
    required,
    readOnly,
    options,
    value,
    onChange,
    className,
  }) => {
    const radios = useMemo(() => {
      if (!options) {
        return []
      }
      return options.map(([v, title]) => ({
        label: title,
        disabled: disabled || readOnly,
        value: v,
      }))
    }, [options, disabled, readOnly])
    return (
      <Form.Group className={className}>
        {label && <Form.Label htmlFor={id}>{label}</Form.Label>}
        <RadioGroup
          as={NativeRadio}
          radios={radios}
          required={required}
          name={id}
          value={value}
          onChange={onChange}
          className={styles.optionItem}
        />
      </Form.Group>
    )
  }
)

function CustomField({ type, options, ...rest }) {
  switch (type) {
    case 'text':
      return <Text {...rest} />
    case 'multi-line':
      return <MultiLine {...rest} />
    case 'checkbox':
      return <Checkbox {...rest} />
    case 'dropdown':
      return <Dropdown {...rest} options={options} />
    case 'multi-select':
      return <MultiSelectField {...rest} options={options} />
    case 'radios':
      return <Radios {...rest} options={options} />
    default:
      return null
  }
}
Dropdown.propTypes = CustomField.propTypes = {
  type: PropTypes.oneOf(fieldType),
  id: PropTypes.string,
  label: PropTypes.node,
  description: PropTypes.node,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  required: PropTypes.bool,
  value: PropTypes.any,
  onChange: PropTypes.func,
  options: PropTypes.any,
  className: PropTypes.string,
  size: PropTypes.string,
}
export default CustomField
