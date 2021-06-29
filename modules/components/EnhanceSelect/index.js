import React from 'react'
import PropTypes from 'prop-types'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import _ from 'lodash'

export default function Select (props) {
  const { t } = useTranslation();
  const options = props.options.map((option) =>
    Array.isArray(option) ? option : ([option, option])
  );
  const valueIncluded = options.some(([key]) => key === props.value);
  const {
    placeholder = t('select'),
    required,
    value,
    onChange,
    disabled,
    id = _.uniqueId('Select'),
  } = props

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
};

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
