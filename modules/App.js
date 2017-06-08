import React, {Component} from 'react'
import PropTypes from 'prop-types'
import NotificationSystem from 'react-notification-system'
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

  addNotification(obj) {
    let notification
    if (obj instanceof Error) {
      const message = obj.message
      const match = message.match(/^Cloud Code validation failed. Error detail : (.*)$/)
      if (match) {
        notification = {
          message: match[1],
          level: 'error'
        }
      } else {
        notification = {
          message,
          level: 'error'
        }
      }
    } else {
      notification = {
        message: obj.message || obj,
        level: obj.level || 'info',
      }
    }
    this._notificationSystem.addNotification(notification)
  }

  componentDidMount() {
    this._notificationSystem = this.refs.notificationSystem
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
            addNotification: this.addNotification.bind(this),
          })}
        </div>
        <NotificationSystem ref="notificationSystem" />
      </div>
    )
  }
}

App.propTypes = {
  router: PropTypes.object,
  children: PropTypes.object.isRequired,
  location: PropTypes.object,
}

App.contextTypes = {
  router: PropTypes.object.isRequired
}
