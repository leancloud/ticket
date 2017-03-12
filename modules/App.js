import React from 'react'
import { Link, IndexLink } from 'react-router'
import AV from 'leancloud-storage'

import common from './common'
import GlobalNav from './GlobalNav'
import Notification from './notification'
import { tap } from '../utils/promise'

export default React.createClass({
  getInitialState() {
    return {
      isCustomerService: false,
    }
  },
  componentDidMount() {
    const user = AV.User.current()
    common.isCustomerService(user)
      .then((isCustomerService) => {
        this.setState({isCustomerService})
      })
    if (user) Notification.login(user.id)
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
      Notification.login(user.id)
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
      Notification.login(user.id)
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
      .then(tap(user => Notification.login(user.id)))
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
