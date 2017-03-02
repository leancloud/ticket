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
  contextTypes: {
    router: React.PropTypes.object
  },
  login(username, password) {
    return new AV.User()
    .setUsername(username)
    .setPassword(password)
    .logIn()
    .then((user) => {
      return common.isCustomerService(user)
    }).then((isCustomerService) => {
      this.setState({isCustomerService})
      const { location } = this.props
      if (location.state && location.state.nextPathname) {
        this.props.router.replace(location.state.nextPathname)
      } else {
        this.props.router.replace('/')
      }
    })
  },
  loginByToken(token) {
    AV.User.become(token).then((user) => {
      return common.isCustomerService(user)
    }).then((isCustomerService) => {
      this.setState({isCustomerService})
      this.context.router.push('/')
    })
  },
  signup(username, password) {
    return new AV.User()
      .setUsername(username)
      .setPassword(password)
      .signUp()
  },
  render() {
    return (
      <div>
        <GlobalNav isCustomerService={this.state.isCustomerService} />
        {this.props.children && React.cloneElement(this.props.children, {
          login: this.login,
          loginByToken: this.loginByToken,
          signup: this.signup,
          isCustomerService: this.state.isCustomerService,
        })}
      </div>
    )
  }
})
