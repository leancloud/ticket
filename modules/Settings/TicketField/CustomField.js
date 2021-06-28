import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Form, Badge } from 'react-bootstrap'
import _ from 'lodash'
import * as Icon from 'react-bootstrap-icons'
import EnhanceSelect from 'modules/components/EnhanceSelect'

import styles from './index.module.scss'
 
export const fieldType = ['text', 'multi-line', 'dropdown', 'checkbox', 'multi-select']

const fieldIconMap = {
  dropdown: Icon.ChevronDown,
  'multi-select': Icon.ListCheck, // th-list
  text: Icon.Fonts, // text-height
  'multi-line': Icon.TextLeft,
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
    let content = null
    switch (type) {
      case 'checkbox':
        content = (
          <Form.Check type="checkbox">
            <Form.Check.Input
              id={id}
              disabled={disabled}
              checked={value}
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
        )
        break
      case 'multi-line':
        content = (
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
        )
        break
      case 'text':
        content = (
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
        )
        break
      case 'multi-select':
        content = (
          <Form.Control
            as="select"
            id={id}
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
              options.map(([v, title]) => {
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
        content = <EnhanceSelect {...{
          id,
          readOnly,
          required,
          disabled,
          value,
          onChange,
          options,
        }} />
        break
    }
    return (
      <Form.Group>
        {type !=='checkbox' && label && <Form.Label htmlFor={id}>{label}</Form.Label>}
        {content}
      </Form.Group>
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
