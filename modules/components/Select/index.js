import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import _ from 'lodash'
import classnames from 'classnames'
import styles from './index.css'

const defaultOptions = []
const Select = memo((props) => {
  const { t } = useTranslation()
  const {
    placeholder = t('select'),
    required,
    value,
    onChange,
    options = defaultOptions,
    className,
    size,
    id = _.uniqueId('Select'),
  } = props
  const reOptions = options.map((option) => (Array.isArray(option) ? option : [option, option]))
  const valueIncluded = reOptions.some(([v]) => v === props.value)
  const showNullOption = !required || (value === undefined && !valueIncluded)
  return (
    <Form.Control
      as="select"
      id={id}
      size={size}
      value={value}
      onChange={(e) => {
        if (onChange) {
          const v = e.target.value
          onChange(v)
        }
      }}
      className={className}
      required={required}
    >
      {showNullOption && (
        <option key="" value="">
          {placeholder}
        </option>
      )}
      {options &&
        options.map(([v, title]) => {
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
  required: PropTypes.bool,
  value: PropTypes.any,
  onChange: PropTypes.func,
  options: PropTypes.array,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  size: PropTypes.string,
}

export const MultiSelect = memo(
  ({ id = _.uniqueId('multiSelect'), values, required, onChange, options, className }) => {
    const hasSelected = values && _.isArray(values) && values.length > 0
    return (
      <div className={styles.groupContainer}>
        {options.map(({ value, label, disabled }, index) => {
          const checked = values && _.isArray(values) && values.includes(value)
          return (
            <Form.Check
              custom
              key={`${id}-${label}`}
              id={`${id}-${label}`}
              checked={checked || false}
              className={classnames(styles.container, className)}
              type="checkbox"
              label={label}
              required={required && index === 0 && !hasSelected}
              value={value}
              onInvalid={(e) => {
                // i18n ?
                e.target.setCustomValidity('You must check at least one option.')
              }}
              onChange={(e) => {
                const checked = e.target.checked
                if (checked) {
                  onChange(_.isArray(values) ? [...values, value] : [value])
                } else {
                  onChange(_.isArray(values) ? values.filter((v) => v !== value) : [])
                }
              }}
              disabled={disabled}
            />
          )
        })}
      </div>
    )
  }
)

MultiSelect.displayName = 'MultiSelect'
MultiSelect.propTypes = {
  id: PropTypes.string,
  values: PropTypes.array,
  required: PropTypes.bool,
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.node,
      value: PropTypes.string.isRequired,
      disabled: PropTypes.bool,
    })
  ).isRequired,
  className: PropTypes.string,
}
