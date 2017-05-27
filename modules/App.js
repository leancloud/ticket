import React, {Component} from 'react'
import PropTypes from 'prop-types'
import AV from 'leancloud-storage'

import common from './common'
import GlobalNav from './GlobalNav'
import Notification from './notification'
import { tap } from '../utils/promise'

export default class App extends Component {

  constructor(props) {
    super(props)
    this.state = {
      isCustomerService: false,
    }
  }

  componentDidMount() {
    const user = AV.User.current()
    common.isCustomerService(user)
      .then((isCustomerService) => {
        this.setState({isCustomerService})
      })
    if (user) Notification.login(user.id)
  }

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
  }

  loginByToken(token) {
    AV.User.become(token).then((user) => {
      Notification.login(user.id)
      return common.isCustomerService(user)
    }).then((isCustomerService) => {
      this.setState({isCustomerService})
      this.context.router.push('/')
    })
  }
  
  signup(username, password) {
    return new AV.User()
      .setUsername(username)
      .setPassword(password)
      .signUp()
      .then(tap(user => Notification.login(user.id)))
  }

  render() {
    return (
      <div>
        <GlobalNav isCustomerService={this.state.isCustomerService} />
        <div className="container">
          {this.props.children && React.cloneElement(this.props.children, {
            login: this.login.bind(this),
            loginByToken: this.loginByToken.bind(this),
            signup: this.signup.bind(this),
            isCustomerService: this.state.isCustomerService,
          })}
        </div>
      </div>
    )
  }
}

App.propTypes = {
  router: PropTypes.object,
  children: PropTypes.object.isRequired,
  location: PropTypes.object,
}
