import React from 'react'
import PropTypes from 'prop-types'

import { Select } from './Select'
import { TextInput } from './TextInput'
import { NumberInput } from './NumberInput'

export function Value({ component, initValue, onChange }) {
  const { type } = component
  switch (type) {
    case 'select':
      return (
        <Select
          options={component.options}
          initValue={initValue}
          onChange={onChange}
          reducer={component.reducer}
        />
      )
    case 'text':
      return <TextInput initValue={initValue} onChange={onChange} />
    case 'number':
      return <NumberInput initValue={initValue} onChange={onChange} min={component.min} />
  }
  return null
}
Value.propTypes = {
  component: PropTypes.shape({
    type: PropTypes.string.isRequired,
  }).isRequired,
  initValue: PropTypes.any,
  onChange: PropTypes.func.isRequired,
}
