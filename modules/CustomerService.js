import React from 'react'
import PropTypes from 'prop-types'

export default class CustomerService extends React.Component {

  render() {
    return <div>
      {this.props.children}
    </div>
  }

}

CustomerService.propTypes = {
  children: PropTypes.object.isRequired,
}
