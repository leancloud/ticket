import _ from 'lodash'
import React, {Component} from 'react'
import PropTypes from 'prop-types'
import NotificationSystem from 'react-notification-system'
import Raven from 'raven-js'
import AV from 'leancloud-storage/live-query'

import {isCustomerService} from './common'
import {getGravatarHash} from '../lib/common'
import GlobalNav from './GlobalNav'
import css from './App.css'

export default class App extends Component {

  constructor(props) {
    super(props)
    this.state = {
      currentUser: AV.User.current(),
      isCustomerService: false,
      organizations: [],
      selectedOrgId: '',
      tagMetadatas: [],
    }
  }

  addNotification(obj) {
    if (obj instanceof Error) {
      console.error(obj.stack || obj)
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
    const user = this.state.currentUser
    if (!user) {
      return
    }

    return user.fetch().then(user => {
      return this.refreshGlobalInfo(user)
    })
    .catch(err => {
      this.refreshGlobalInfo()
      this.addNotification(err)
    })
  }

  fetchTagMetadatas() {
    return new AV.Query('TagMetadata').find()
    .then(tagMetadatas => {
      return tagMetadatas
    })
  }

  refreshTagMetadatas() {
    return this.fetchTagMetadatas()
    .then(tagMetadatas => {
      this.setState({
        tagMetadatas
      })
      return
    })
  }

  refreshGlobalInfo(currentUser) {
    if (!currentUser) {
      this.setState({
        currentUser: null,
        isCustomerService: false,
        organizations: [],
        tagMetadatas: []
      })
      Raven.setUserContext()
      return
    }

    return Promise.all([
      isCustomerService(currentUser),
      new AV.Query('Organization')
        .include('memberRole')
        .find(),
      this.fetchTagMetadatas(),
    ])
    .then(([isCustomerService, organizations, tagMetadatas]) => {
      this.setState({
        currentUser,
        isCustomerService,
        organizations,
        tagMetadatas
      })
      Raven.setUserContext({
        username: currentUser.get('username'),
        id: currentUser.id,
      })
      return
    })
  }

  onLogin(user) {
    return this.refreshGlobalInfo(user)
  }

  logout() {
    return AV.User.logOut()
    .then(() => {
      this.refreshGlobalInfo()
      this.context.router.push('/')
      return
    })
  }

  updateCurrentUser(props) {
    const user = this.state.currentUser
    Object.entries(props).forEach(([k, v]) => {
      user.set(k, v)
    })
    if (props.email) {
      user.set('gravatarHash', getGravatarHash(props.email))
    }
    return user.save().then(user => {
      this.setState({currentUser: user})
      return
    })
  }

  joinOrganization(organization) {
    const organizations = this.state.organizations
    organizations.push(organization)
    this.setState({organizations})
  }

  handleOrgChange(e) {
    this.setState({selectedOrgId: e.target.value})
  }

  leaveOrganization(organization) {
    const organizations = this.state.organizations
    this.setState({organizations: _.reject(organizations, {id: organization.id})})
  }

  getChildContext() {
    return {
      addNotification: this.addNotification.bind(this),
      tagMetadatas: this.state.tagMetadatas,
      refreshTagMetadatas: this.refreshTagMetadatas.bind(this),
    }
  }

  render() {
    return (
      <div>
        <GlobalNav currentUser={this.state.currentUser}
          isCustomerService={this.state.isCustomerService}
          logout={this.logout.bind(this)} />
        <div className={ 'container ' + css.main }>
          {this.props.children && React.cloneElement(this.props.children, {
            onLogin: this.onLogin.bind(this),
            currentUser: this.state.currentUser,
            isCustomerService: this.state.isCustomerService,
            updateCurrentUser: this.updateCurrentUser.bind(this),
            organizations: this.state.organizations,
            joinOrganization: this.joinOrganization.bind(this),
            handleOrgChange: this.handleOrgChange.bind(this),
            leaveOrganization: this.leaveOrganization.bind(this),
            selectedOrgId: this.state.selectedOrgId,
            tagMetadatas: this.state.tagMetadatas,
          })}
        </div>
        <ServerNotification currentUser={this.state.currentUser}
          isCustomerService={this.state.isCustomerService} />
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
  addNotification: PropTypes.func,
  tagMetadatas: PropTypes.array,
  refreshTagMetadatas: PropTypes.func,
}

class ServerNotification extends Component {

  constructor(props) {
    super(props)
    let permission = 'denied'
    if (window.Notification && Notification.permission === 'granted') {
      permission = 'granted'
    } else if (window.Notification && Notification.permission !== 'denied') {
      Notification.requestPermission((status) => {
        if (Notification.permission !== status) {
          Notification.permission = status
        }
        this.setState({permission: status})
      })
    }
    this.state = {permission}
  }

  componentDidMount() {
    this.updateLiveQuery(this.props.isCustomerService)
  }

  shouldComponentUpdate(nextProps, _nextState) {
    return this.props.isCustomerService !== nextProps.isCustomerService
  }

  componentWillReceiveProps(nextProps) {
    this.updateLiveQuery(nextProps.isCustomerService)
  }

  updateLiveQuery(isCustomerService) {
    if (this.ticketsLiveQuery) {
      this.ticketsLiveQuery.unsubscribe()
    }
    if (isCustomerService) {
      return new AV.Query('Ticket').equalTo('assignee', this.props.currentUser)
      .subscribe()
      .then((liveQuery) => {
        this.ticketsLiveQuery = liveQuery
        liveQuery.on('create', (ticket) => {
          this.notify({title: '新的工单', body: `${ticket.get('title')} (#${ticket.get('nid')})`})
        })
        liveQuery.on('enter', (ticket, updatedKeys) => {
          if (updatedKeys.indexOf('assignee') !== -1) {
            this.notify({title: '转移工单', body: `${ticket.get('title')} (#${ticket.get('nid')})`})
          }
        })
        liveQuery.on('update', (ticket, updatedKeys) => {
          if (updatedKeys.indexOf('latestReply') !== -1
              && ticket.get('latestReply').author.username !== this.props.currentUser.get('username')) {
            this.notify({title: '新的回复', body: `${ticket.get('title')} (#${ticket.get('nid')})`})
          }
        })
        return
      })
    } else {
      return new AV.Query('Ticket').equalTo('author', this.props.currentUser)
      .subscribe()
      .then((liveQuery) => {
        this.ticketsLiveQuery = liveQuery
        liveQuery.on('update', (ticket, updatedKeys) => {
          if (updatedKeys.indexOf('latestReply') !== -1
              && ticket.get('latestReply').author.username !== this.props.currentUser.get('username')) {
            this.notify({title: '新的回复', body: `${ticket.get('title')} (#${ticket.get('nid')})`})
          }
        })
        return
      })
    }
  }

  componentWillUnmount() {
    return Promise.all([
      this.ticketsLiveQuery.unsubscribe(),
    ])
  }

  notify({title, body}) {
    if (this.state.permission === 'granted') {
      var n = new Notification(title, {body})
      n.onshow = function () {
        setTimeout(n.close.bind(n), 5000)
      }
    } else {
      alert(`${title}\n\n${body}`)
    }
  }

  render() {
    return <div></div>
  }

}

ServerNotification.propTypes = {
  currentUser: PropTypes.object,
  isCustomerService: PropTypes.bool,
}
