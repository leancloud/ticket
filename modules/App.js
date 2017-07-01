import React, {Component} from 'react'
import PropTypes from 'prop-types'
import NotificationSystem from 'react-notification-system'
import AV from 'leancloud-storage/live-query'

import common from './common'
import GlobalNav from './GlobalNav'
import css from './App.css'

export default class App extends Component {

  constructor(props) {
    super(props)
    this.state = {
      isCustomerService: false,
    }
  }

  addNotification(obj) {
    if (obj instanceof Error) {
      const message = obj.message
      const match = message.match(/^Cloud Code validation failed. Error detail : (.*)$/)
      this._notificationSystem.addNotification({
        message: match ? match[1] : message,
        level: 'error',
      })
    } else {
      this._notificationSystem.addNotification({
        message: obj && obj.message || '操作成功',
        level: obj && obj.level || 'success',
      })
    }
  }

  componentDidMount() {
    this._notificationSystem = this.refs.notificationSystem
    const user = AV.User.current()
    common.isCustomerService(user)
      .then((isCustomerService) => {
        this.setState({isCustomerService})
      })
  }

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
  }

  loginByToken(token) {
    return AV.User.become(token).then((user) => {
      return common.isCustomerService(user)
    }).then((isCustomerService) => {
      this.setState({isCustomerService})
      this.context.router.push('/')
    })
  }

  getChildContext() {
    return {addNotification: this.addNotification.bind(this)}
  }

  render() {
    return (
      <div>
        <GlobalNav isCustomerService={this.state.isCustomerService} />
        <div className={ 'container ' + css.main }>
          {this.props.children && React.cloneElement(this.props.children, {
            login: this.login.bind(this),
            loginByToken: this.loginByToken.bind(this),
            isCustomerService: this.state.isCustomerService,
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

App.childContextTypes = {
  addNotification: PropTypes.func
}

