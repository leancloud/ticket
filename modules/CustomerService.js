import React from 'react'
import PropTypes from 'prop-types'

export default function CustomerService(props) {
  return <div>
    {props.children && React.cloneElement(props.children, {
      addNotification: props.addNotification,
    })}
  </div>
}

CustomerService.propTypes = {
  addNotification: PropTypes.func.isRequired,
}
