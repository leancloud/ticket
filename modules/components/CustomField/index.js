import React, { memo, useCallback, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { Form, Button, InputGroup } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import _ from 'lodash'
import { storage } from 'lib/leancloud'
import Select, { MultiSelect } from 'modules/components/Select'
import { RadioGroup, NativeRadio } from 'modules/components/Radio'
import styles from './index.module.scss'

export const includeOptionsType = ['dropdown', 'multi-select', 'radios']
export const fieldType = [
  'text',
  'multi-line',
  'checkbox',
  'dropdown',
  'multi-select',
  'radios',
  'file',
]

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
  ({ id = _.uniqueId('Checkbox'), label, disabled, onChange, value, readOnly, className }) => {
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

const FileInput = memo(
  ({
    id = _.uniqueId('FileInput'),
    label,
    value,
    onChange,
    disabled,
    readOnly,
    required,
    className,
    size,
  }) => {
    const { t } = useTranslation()
    const [path, setPath] = useState(value || '')
    const banned = disabled || readOnly
    const uploadFile = useCallback(
      (file) => {
        if (!onChange) {
          return
        }
        setPath(file)
        storage
          .upload(file.name, file)
          .then(({ url }) => {
            onChange(url)
            return
          })
          .catch((err) => {
            // todo err 如何处理比较好？
            console.log(err)
            setPath(undefined)
          })
      },
      [onChange]
    )
    console.log(path)
    return (
      <Form.Group className={className}>
        {label && <Form.Label htmlFor={id}>{label}</Form.Label>}
        <input
          hidden
          type="file"
          id={id}
          disabled={banned}
          onChange={(e) => {
            if (e.target && e.target.files) {
              uploadFile(e.target.files[0])
            }
          }}
        />
        <InputGroup size={size}>
          <Form.Control type="text" required={required} value={path} readOnly disabled={disabled} />
          <InputGroup.Append>
            <Button as={banned ? undefined : Form.Label} htmlFor={id} disabled={banned}>
              {t('upload')}
            </Button>
          </InputGroup.Append>
        </InputGroup>
      </Form.Group>
    )
  }
)

function CustomField({ type, options, required, ...rest }) {
  switch (type) {
    case 'text':
      return <Text required={required} {...rest} />
    case 'multi-line':
      return <MultiLine required={required} {...rest} />
    case 'checkbox':
      return <Checkbox {...rest} />
    case 'dropdown':
      return <Dropdown {...rest} required={required} options={options} />
    case 'multi-select':
      return <MultiSelectField required={required} {...rest} options={options} />
    case 'radios':
      return <Radios {...rest} required={required} options={options} />
    case 'file':
      return <FileInput {...rest} required={required} />
    default:
      return null
  }
}
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
  options: PropTypes.any,
  className: PropTypes.string,
  size: PropTypes.string,
}
export default CustomField

function CustomFieldDisplay({ type, value, label, className, options }) {
  const { t } = useTranslation()
  const NoneNode = (
    <Form.Group className={className}>
      <Form.Label>{label}</Form.Label>
      <p>{t('none')} </p>
    </Form.Group>
  )
  switch (type) {
    case 'file':
    case 'text':
    case 'multi-line':
      if (value === undefined) {
        return NoneNode
      }
      return (
        <Form.Group className={className}>
          <Form.Label>{label}</Form.Label>
          <p>{value} </p>
        </Form.Group>
      )
    case 'checkbox':
      value = value === 'false' ? false : Boolean(value)
      return <Checkbox value={value} className={className} label={label} readOnly />
    case 'dropdown':
    case 'radios':
      return (
        <Form.Group className={className}>
          <Form.Label>{label}</Form.Label>
          <p>{getDisplayText(options, value) || t('none')} </p>
        </Form.Group>
      )
    case 'multi-select':
      if (!value || !Array.isArray(value)) {
        return NoneNode
      }
      const reOptions = (options || []).filter(([v]) => {
        return value.includes(v)
      })
      if (reOptions.length === 0) {
        return NoneNode
      }
      return (
        <MultiSelectField label={label} options={reOptions} value={value} className={className} />
      )
    default:
      return null
  }
}

CustomFieldDisplay.propTypes = {
  type: PropTypes.oneOf(fieldType),
  label: PropTypes.node,
  value: PropTypes.any,
  options: PropTypes.any,
  className: PropTypes.string,
}

export { CustomFieldDisplay }
