/* global SENTRY_DSN_PUBLIC */

import _ from 'lodash'
import React, { Component } from 'react'
import {Route, Switch, withRouter} from 'react-router-dom'
import PropTypes from 'prop-types'
import NotificationSystem from 'react-notification-system'
import Raven from 'raven-js'
import moment from 'moment'

import {auth, db} from '../lib/leancloud'
import { isCustomerService } from './common'
import GlobalNav from './GlobalNav'
import css from './App.css'
import {locale} from './i18n/I18nProvider'

import { AuthRoute } from './utils/AuthRoute'
import Home from './Home'
import Tickets from './Tickets'
import About from './About'
import Login from './Login'
import NewTicket from './NewTicket'
import Ticket from './Ticket'
import Messages from './Messages'
import NotFound from './NotFound'
import Notifications from './Notifications'
import CustomerService from './CustomerService'
import ErrorPage from './Error'
import User from './User'
import Settings from './Settings'

if (locale === 'zh') {
  moment.updateLocale('zh-cn', {
    calendar : {
      lastWeek : function() {
        // eslint-disable-next-line i18n/no-chinese-character
        return this < moment().startOf('week') ? '[上]ddddLT' : 'ddddLT'
      },
    }
  })
}

if (SENTRY_DSN_PUBLIC !== '') {
  Raven.config(SENTRY_DSN_PUBLIC).install()
}

class App extends Component {
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

  async logout() {
    await auth.logOut()
    this.refreshGlobalInfo()
    this.props.history.push('/login')
  }

  updateCurrentUser(props) {
    const user = this.state.currentUser
    const data = _.clone(props)
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
    const props = {
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
    }

    return (
      <div>
        <GlobalNav
          currentUser={this.state.currentUser}
          isCustomerService={this.state.isCustomerService}
          logout={this.logout.bind(this)}
        />
        <div className={'container ' + css.main}>
          <Switch>
            <Route path="/" exact><Home {...props} /></Route>
            <Route path="/about" component={About} />
            <Route path="/login"><Login {...props} /></Route>
            <AuthRoute path="/tickets" exact><Tickets {...props} /></AuthRoute>
            <AuthRoute path="/tickets/new"><NewTicket {...props} /></AuthRoute>
            <AuthRoute path="/tickets/:nid"><Ticket {...props} /></AuthRoute>
            <AuthRoute path="/messages"><Messages {...props} /></AuthRoute>
            <AuthRoute path="/notifications"><Notifications {...props} /></AuthRoute>
            <AuthRoute mustCustomerService path="/customerService"><CustomerService /></AuthRoute>
            <AuthRoute path="/users/:username"><User {...props} /></AuthRoute>
            <AuthRoute path="/settings"><Settings {...props} /></AuthRoute>
            <Route path="/error" component={ErrorPage} />
            <Route path="*" component={NotFound} />
          </Switch>
        </div>
        <ServerNotification currentUser={this.state.currentUser} />
        <NotificationSystem ref="notificationSystem" />
      </div>
    )
  }
}

App.propTypes = {
  history: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
}

App.childContextTypes = {
  addNotification: PropTypes.func,
  tagMetadatas: PropTypes.array,
  refreshTagMetadatas: PropTypes.func
}

export default withRouter(App)

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
