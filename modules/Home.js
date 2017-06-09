import React, {Component} from 'react'
import PropTypes from 'prop-types'

export default class Home extends Component {

  componentDidMount() {
    if (this.props.isCustomerService) {
      this.context.router.push('/customerService/tickets')
    } else {
      this.context.router.push('/tickets')
    }
  }

  render() {
    return <div>Home</div>
  }

}

Home.propTypes = {
  isCustomerService: PropTypes.bool
}

Home.contextTypes = {
  router: PropTypes.object.isRequired
}
