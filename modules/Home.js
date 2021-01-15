import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {auth} from '../lib/leancloud'

export default class Home extends Component {
 
  componentDidMount() {
    this.redirect(this.props)
  }

  componentWillReceiveProps(nextProps){
    this.redirect(nextProps)
  }

  redirect(props) {
    if (!auth.currentUser()) {
      this.context.router.replace('/login')
      return
    }

    if (props.isCustomerService) {
      this.context.router.replace('/customerService/tickets')
    } else {
      this.context.router.replace('/tickets')
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
