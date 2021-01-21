import _ from 'lodash'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import NotificationSystem from 'react-notification-system'
import Raven from 'raven-js'

import {auth, db} from '../lib/leancloud'
import { isCustomerService } from './common'
import { getGravatarHash } from '../lib/common'
import GlobalNav from './GlobalNav'
import css from './App.css'
import {locale} from './i18n/I18nProvider'

export default class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      currentUser: auth.currentUser(),
      isCustomerService: false,
      organizations: [],
      selectedOrgId: '',
      tagMetadatas: []
    }
  }

  addNotification(obj) {
    if (obj instanceof Error) {
      console.error(obj.stack || obj)
      const message = obj.message
      const match = message.match(
        /^Cloud Code validation failed. Error detail : (.*)$/
      )
      this._notificationSystem.addNotification({
        message: match ? match[1] : message,
        level: 'error'
      })
    } else {
      this._notificationSystem.addNotification({
        message: (obj && obj.message) || 'Operation succeeded.',
        level: (obj && obj.level) || 'success'
      })
    }
  }

  componentDidMount() {
    this._notificationSystem = this.refs.notificationSystem
    const user = this.state.currentUser
    if (!user) {
      return
    }

    return user
      .get()
      .then((user) => {
        return this.refreshGlobalInfo(user)
      })
      .catch((err) => {
        this.refreshGlobalInfo()
        this.addNotification(err)
      })
  }

  fetchTagMetadatas() {
    return db.class('TagMetadata').find().then((tagMetadatas) => {
      return tagMetadatas
    })
  }

  refreshTagMetadatas() {
    return this.fetchTagMetadatas().then((tagMetadatas) => {
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
      db.class('Organization').include('memberRole').find(),
      this.fetchTagMetadatas()
    ]).then(([isCustomerService, organizations, tagMetadatas]) => {
      this.setState({
        currentUser,
        isCustomerService,
        organizations,
        tagMetadatas
      })
      Raven.setUserContext({
        username: currentUser.get('username'),
        id: currentUser.id
      })
      return
    })
  }

  onLogin(user) {
    return this.refreshGlobalInfo(user)
  }

  logout() {
    return auth.logOut().then(() => {
      this.refreshGlobalInfo()
      this.context.router.push('/')
      return
    })
  }

  updateCurrentUser(props) {
    const user = this.state.currentUser
    const data = _.clone(props)
    if (props.email) {
      data.gravatarHash = getGravatarHash(props.email)
    }
    return user.update(data).then((user) => {
      Object.assign(user.data, data)
      this.setState({ currentUser: user })
      return
    })
  }

  joinOrganization(organization) {
    const organizations = this.state.organizations
    organizations.push(organization)
    this.setState({ organizations })
  }

  handleOrgChange(e) {
    this.setState({ selectedOrgId: e.target.value })
  }

  leaveOrganization(organization) {
    const organizations = this.state.organizations
    this.setState({
      organizations: _.reject(organizations, { id: organization.id })
    })
  }

  getChildContext() {
    return {
      addNotification: this.addNotification.bind(this),
      tagMetadatas: this.state.tagMetadatas,
      refreshTagMetadatas: this.refreshTagMetadatas.bind(this)
    }
  }

  render() {
    return (
      <div>
        <GlobalNav
          currentUser={this.state.currentUser}
          isCustomerService={this.state.isCustomerService}
          logout={this.logout.bind(this)}
        />
        <div className={'container ' + css.main}>
          {this.props.children &&
            React.cloneElement(this.props.children, {
              onLogin: this.onLogin.bind(this),
              currentUser: this.state.currentUser,
              isCustomerService: this.state.isCustomerService,
              updateCurrentUser: this.updateCurrentUser.bind(this),
              organizations: this.state.organizations,
              joinOrganization: this.joinOrganization.bind(this),
              handleOrgChange: this.handleOrgChange.bind(this),
              leaveOrganization: this.leaveOrganization.bind(this),
              selectedOrgId: this.state.selectedOrgId,
              tagMetadatas: this.state.tagMetadatas
            })}
        </div>
        <ServerNotification currentUser={this.state.currentUser} />
        <NotificationSystem ref="notificationSystem" />
      </div>
    )
  }
}

App.propTypes = {
  router: PropTypes.object,
  children: PropTypes.object.isRequired,
  location: PropTypes.object
}

App.contextTypes = {
  router: PropTypes.object.isRequired
}

App.childContextTypes = {
  addNotification: PropTypes.func,
  tagMetadatas: PropTypes.array,
  refreshTagMetadatas: PropTypes.func
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
        this.setState({ permission: status })
      })
    }
    this.state = { permission }
  }

  componentDidMount() {
    this.updateLiveQuery()
  }

  componentDidUpdate(prevProps) {
    if (this.props.currentUser !== prevProps.currentUser) {
      return this.updateLiveQuery()
    }
  }

  updateLiveQuery() {
    const i18nMessages = {
      newTicket: [
        'New ticket',
        // eslint-disable-next-line i18n/no-chinese-character
        '新的工单'
      ],
      assignTicket: [
        'Assign ticket',
        // eslint-disable-next-line i18n/no-chinese-character
        '转移工单'
      ],
      newReply: [
        'New reply',
        // eslint-disable-next-line i18n/no-chinese-character
        '新的回复'
      ]
    }
    const localeIndex = locale === 'en' ? 0 : 1
    const t = (label) => i18nMessages[label][localeIndex]
    if (this.messageLiveQuery) {
      this.messageLiveQuery.unsubscribe()
    }
    if (!this.props.currentUser) {
      return
    }

    return db.class('Message')
      .where('to', '==', this.props.currentUser)
      .where('isRead', '==', false)
      .subscribe()
      .then(liveQuery => {
        this.messageLiveQuery = liveQuery
        liveQuery.on('create', message => {
          return message.get({include: ['ticket']}).then(message => {
            const messageType = message.get('type')
            const ticket = message.get('ticket')
            if (messageType == 'newTicket') {
              this.notify({title: t('newTicket'), body: `${ticket.get('title')} (#${ticket.get('nid')})`})
            } else if (messageType == 'changeAssignee') {
              this.notify({title: t('assignTicket'), body: `${ticket.get('title')} (#${ticket.get('nid')})`})
            } else if (messageType == 'reply') {
              this.notify({title: t('newReply'), body: `${ticket.get('title')} (#${ticket.get('nid')})`})
            }
            return
          })
        })
        return
      })
  }

  componentWillUnmount() {
    return this.messageLiveQuery.unsubscribe()
  }

  notify({ title, body }) {
    if (this.state.permission === 'granted') {
      var n = new Notification(title, { body })
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
}
