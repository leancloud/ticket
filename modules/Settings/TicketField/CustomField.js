import React, { memo, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Form } from 'react-bootstrap'
import _ from 'lodash'
import Select, { MultiSelect } from 'modules/components/Select'
import { RadioGroup, NativeRadio } from 'modules/components/Radio'
import styles from './index.module.scss'

export const fieldType = ['text', 'multi-line', 'checkbox', 'dropdown', 'multi-select', 'radios']
const Text = memo(
  ({ id = _.uniqueId('Text'), label, value, onChange, disabled, readOnly, required }) => {
    return (
      <Form.Group>
        {label && <Form.Label htmlFor={id}>{label}</Form.Label>}
        <Form.Control
          id={id}
          disabled={disabled}
          readOnly={readOnly}
          value={value}
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
  ({ id = _.uniqueId('MultiLine'), label, value, onChange, disabled, readOnly, required }) => {
    return (
      <Form.Group>
        {label && <Form.Label htmlFor={id}>{label}</Form.Label>}
        <Form.Control
          id={id}
          as="textarea"
          rows={3}
          disabled={disabled}
          readOnly={readOnly}
          value={value}
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
  ({ id = _.uniqueId('Checkbox'), label, disabled, onChange, value, required, readOnly }) => {
    return (
      <Form.Group>
        <Form.Check type="checkbox">
          <Form.Check.Input
            id={id}
            disabled={disabled}
            checked={value}
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
const Dropdown = memo(({ id = _.uniqueId('Dropdown'), label, ...rest }) => {
  return (
    <Form.Group>
      {label && <Form.Label htmlFor={id}>{label}</Form.Label>}
      <Select id={id} placeholder={defaultPlaceholder} {...rest} />
    </Form.Group>
  )
})

const MultiSelectField = memo(
  ({ id = _.uniqueId('MultiSelect'), label, onChange, value, required, options }) => {
    const reOptions = useMemo(() => {
      if (!options) {
        return []
      }
      return options.map(([v, title]) => ({
        label: title,
        value: v,
      }))
    }, [options])
    return (
      <Form.Group>
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
      <Form.Group>
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

const CustomField = memo(({ type, options, ...rest }) => {
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
})

CustomField.propTypes = {
  type: PropTypes.oneOf(fieldType),
  id: PropTypes.string,
  label: PropTypes.node,
  description: PropTypes.node,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  required: PropTypes.bool,
  value: PropTypes.any,
  onChange: PropTypes.func,
  options: PropTypes.array,
}
export default CustomField
