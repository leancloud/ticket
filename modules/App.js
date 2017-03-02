import React from 'react'
import { Link, IndexLink } from 'react-router'
import AV from 'leancloud-storage'

import common from './common'
import GlobalNav from './GlobalNav'

export default React.createClass({
  getInitialState() {
    return {
      isCustomerService: false,
    }
  },
  componentDidMount() {
    common.isCustomerService(AV.User.current())
    .then((isCustomerService) => {
      this.setState({isCustomerService})
    })
  },
  render() {
    return (
      <div>
        <GlobalNav isCustomerService={this.state.isCustomerService} />
        {this.props.children}
      </div>
    )
  }
})
