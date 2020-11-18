import React from 'react'
import PropTypes from 'prop-types'

export default (BaseComponent) => {
  const LocalizedComponent = (props, context) => (
    <BaseComponent
      t={context.t}
      locale={context.locale}
      {...props}
    />
  )

  LocalizedComponent.contextTypes = {
    t: PropTypes.func.isRequired,
    locale: PropTypes.string.isRequired,
  }
   
  return LocalizedComponent
}