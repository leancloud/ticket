import React from 'react'
import PropTypes from 'prop-types'

export default class CustomerService extends React.Component {

  render() {
    return <div>
      {this.props.children && React.cloneElement(this.props.children, {
        addNotification: this.props.addNotification.bind(this),
      })}
    </div>
  }

}

CustomerService.propTypes = {
  children: PropTypes.object.isRequired,
  addNotification: PropTypes.func.isRequired,
}
