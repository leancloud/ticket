import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Form, Badge } from 'react-bootstrap'
import _ from 'lodash'
import * as Icon from 'react-bootstrap-icons'

import styles from './index.module.scss'

export const fieldType = ['text', 'multiLine', 'dropdown', 'checkbox', 'multi-select']

const fieldIconMap = {
  dropdown: Icon.ChevronDown,
  'multi-select': Icon.ListCheck, // th-list
  text: Icon.Fonts, // text-height
  multiLine: Icon.TextLeft,
  checkbox: Icon.CheckSquare,
}

export const CustomFieldLabel = memo(({ type }) => {
  const { t } = useTranslation()
  const TypeIcon = fieldIconMap[type]
  return (
    <div className={'d-flex flex-column align-items-center pl-3 pr-3'}>
      <TypeIcon className={styles.icon} />
      <span className="mt-2">{t(`ticketField.type.${type}`)}</span>
    </div>
  )
})
CustomFieldLabel.propTypes = {
  type: PropTypes.oneOf(fieldType).isRequired,
}

export const DisplayCustomField = memo(({ type }) => {
  const { t } = useTranslation()
  return (
    <p>
      <Badge variant="info" className={styles.displayType}>
        {t(`ticketField.type.${type}`)}
      </Badge>
    </p>
  )
})
DisplayCustomField.propTypes = {
  type: PropTypes.oneOf(fieldType).isRequired,
}

const CustomField = memo(
  ({
    type,
    id = _.uniqueId('customField'),
    label,
    disabled,
    readOnly,
    value,
    onChange,
    options,
    required,
  }) => {
    const { t } = useTranslation()
    if (type === 'checkbox') {
      return (
        <Form.Check type="checkbox">
          <Form.Check.Input
            id={id}
            disabled={disabled}
            checked={value || false}
            onChange={(e) => {
              if (onChange) {
                const { checked } = e.target
                onChange(checked)
              }
            }}
            required={required}
          />
          {label && <Form.Check.Label htmlFor={id}>{label}</Form.Check.Label>}
        </Form.Check>
      )
    }
    let content = null
    switch (type) {
      case 'multiLine':
        content = (
          <Form.Control
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
        )
        break
      case 'text':
        content = (
          <Form.Control
            id={id}
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
        )
        break
      case 'multi-select':
        content = (
          <Form.Control
            as="select"
            value={value}
            onChange={(e) => {
              if (onChange) {
                const v = Array.from(e.target.selectedOptions, (option) => option.value)
                onChange(v)
              }
            }}
            disabled={disabled}
            required={required}
            multiple
          >
            {options &&
              options.map(({ value: v, title }) => {
                return (
                  <option key={`${v}-${title}`} value={v}>
                    {title}
                  </option>
                )
              })}
          </Form.Control>
        )
        break
      case 'dropdown':
        {
          const valueIncluded = options && options.some(({ value: v }) => v === value)
          content = (
            <Form.Control
              as="select"
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
                  {t('select')}
                </option>
              )}
              {options &&
                options.map(({ value: v, title }) => {
                  return (
                    <option key={`${v}-${title}`} value={v}>
                      {title}
                    </option>
                  )
                })}
            </Form.Control>
          )
        }
        break
    }

    return (
      <>
        {label && <Form.Label htmlFor={id}>{label}</Form.Label>}
        {content}
      </>
    )
  }
)

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
