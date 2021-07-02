import React, { memo, useRef } from 'react'
import PropTypes from 'prop-types'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import _ from 'lodash'
import classnames from 'classnames'
import styles from './index.css'

const Select = memo((props) => {
  const { t } = useTranslation()
  const {
    placeholder = t('select'),
    required,
    value,
    onChange,
    disabled,
    options = [],
    id = _.uniqueId('Select'),
  } = props
  const reOptions = options.map((option) => (Array.isArray(option) ? option : [option, option]))
  const valueIncluded = reOptions.some(([key]) => key === props.value)
  return (
    <Form.Control
      as="select"
      id={id}
      value={value}
      onChange={(e) => {
        if (onChange) {
          const v = e.target.value
          onChange(v)
        }
      }}
      disabled={disabled}
      required={required}
    >
      {value === undefined && !valueIncluded && (
        <option key="" value="">
          {placeholder}
        </option>
      )}
      {reOptions &&
        reOptions.map(([v, title]) => {
          return (
            <option key={`${v}-${title}`} value={v}>
              {title}
            </option>
          )
        })}
    </Form.Control>
  )
})
Select.displayName = 'Select'
export default Select
Select.propTypes = {
  id: PropTypes.string,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  required: PropTypes.bool,
  value: PropTypes.any,
  onChange: PropTypes.func,
  options: PropTypes.array,
  placeholder: PropTypes.string,
}

export const MultiSelect = memo(({ name, values, options, required, onChange, className }) => {
  const id = useRef(_.uniqueId('multiSelect'))
  return (
    <div className={styles.groupContainer}>
      {options.map(({ value, label, disabled, readOnly }) => {
        const checked = values && _.isArray(values) && values.includes(value)
        return (
          <Form.Check
            custom
            key={`${id.current}-${label}`}
            id={`${id.current}-${label}`}
            checked={checked || false}
            className={classnames(styles.container, className)}
            type="checkbox"
            label={label}
            name={name}
            required={required}
            value={value}
            onChange={(e) => {
              const checked = e.target.checked
              if (checked) {
                onChange(_.isArray(values) ? [...values, value] : [value])
              } else {
                onChange(_.isArray(values) ? values.filter((v) => v !== value) : [])
              }
            }}
            disabled={disabled}
            readOnly={readOnly}
          />
        )
      })}
    </div>
  )
})

MultiSelect.displayName = 'MultiSelect'
MultiSelect.propTypes = {
  name: PropTypes.string,
  values: PropTypes.array,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.node,
      value: PropTypes.string.isRequired,
      disabled: PropTypes.bool,
      readOnly: PropTypes.bool,
    })
  ).isRequired,
  required: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
}
