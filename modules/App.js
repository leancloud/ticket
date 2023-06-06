/* global SENTRY_DSN_PUBLIC */

import _ from 'lodash'
import React, { Component } from 'react'
import { Container } from 'react-bootstrap'
import { Route, Switch, withRouter } from 'react-router-dom'
import PropTypes from 'prop-types'
import NotificationSystem from 'react-notification-system'
import Raven from 'raven-js'
import i18next from 'i18next'

import './style/index.scss'
import './i18n'
import { auth, db } from '../lib/leancloud'
import { AppContext } from './context'
import { getRoles, isCustomerService, isStaff, isCollaborator, isAdmin } from './common'
import GlobalNav from './GlobalNav'
import css from './App.css'

import { AuthRoute, StaffRoute } from './utils/AuthRoute'
import Home from './Home'
import Tickets from './Tickets'
import About from './About'
import Login from './Login'
import NewTicket from './NewTicket.next'
import Ticket from './Ticket'
import NotFound from './NotFound'
import Notification from './Notification'
import CustomerService from './CustomerService'
import ErrorPage from './Error'
import User from './User'
import Settings from './Settings'

if (SENTRY_DSN_PUBLIC !== '') {
  Raven.config(SENTRY_DSN_PUBLIC).install()
}

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: true,
      currentUser: auth.currentUser,
      isAdmin: false,
      isStaff: false,
      isCustomerService: false,
      isCollaborator: false,
      isUser: true,
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
        message: (obj && obj.message) || 'Operation succeeded.',
        level: (obj && obj.level) || 'success',
      })
    }
  }

  componentDidMount() {
    this._notificationSystem = this.refs.notificationSystem
    const user = this.state.currentUser
    if (user) {
      return user
        .get()
        .then((user) => this.refreshGlobalInfo(user))
        .catch((err) => this.addNotification(err))
    }
    return this.refreshGlobalInfo()
  }

  fetchTagMetadatas() {
    return db.class('TagMetadata').find()
  }

  refreshTagMetadatas() {
    return this.fetchTagMetadatas().then((tagMetadatas) => {
      this.setState({
        tagMetadatas,
      })
      return
    })
  }

  async refreshGlobalInfo(currentUser) {
    if (!currentUser) {
      this.setState({
        loading: false,
        currentUser: null,
        isAdmin: false,
        isStaff: false,
        isCustomerService: false,
        isCollaborator: false,
        isUser: true,
        organizations: [],
        tagMetadatas: [],
      })
      Raven.setUserContext()
      return
    }

    this.setState({ loading: true })
    try {
      const [roles, organizations, tagMetadatas] = await Promise.all([
        getRoles(currentUser),
        db.class('Organization').include('memberRole').find(),
        this.fetchTagMetadatas(),
      ])
      this.setState({
        currentUser,
        organizations,
        tagMetadatas,
        isAdmin: isAdmin(roles),
        isStaff: isStaff(roles),
        isCustomerService: isCustomerService(roles),
        isCollaborator: isCollaborator(roles),
        isUser: roles.length === 0,
      })
      Raven.setUserContext({
        username: currentUser.get('username'),
        id: currentUser.id,
      })
    } finally {
      this.setState({ loading: false })
    }
  }

  setCurrentUser(user) {
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
      organizations: _.reject(organizations, { id: organization.id }),
    })
  }

  getChildContext() {
    return {
      addNotification: this.addNotification.bind(this),
      tagMetadatas: this.state.tagMetadatas,
      refreshTagMetadatas: this.refreshTagMetadatas.bind(this),
    }
  }

  render() {
    const props = {
      currentUser: this.state.currentUser,
      isAdmin: this.state.isAdmin,
      isStaff: this.state.isStaff,
      isCustomerService: this.state.isCustomerService,
      isCollaborator: this.state.isCollaborator,
      isUser: this.state.isUser,
      updateCurrentUser: this.updateCurrentUser.bind(this),
      organizations: this.state.organizations,
      joinOrganization: this.joinOrganization.bind(this),
      handleOrgChange: this.handleOrgChange.bind(this),
      leaveOrganization: this.leaveOrganization.bind(this),
      selectedOrgId: this.state.selectedOrgId,
      tagMetadatas: this.state.tagMetadatas,
    }

    return (
      <>
        {!this.state.loading && (
          <AppContext.Provider
            value={{
              currentUser: this.state.currentUser,
              isAdmin: props.isAdmin,
              isStaff: props.isStaff,
              isCustomerService: props.isCustomerService,
              isCollaborator: props.isCollaborator,
              isUser: props.isUser,
              tagMetadatas: props.tagMetadatas,
              addNotification: this.getChildContext().addNotification,
              setCurrentUser: this.setCurrentUser.bind(this),
            }}
          >
            <GlobalNav user={this.state.currentUser?.toJSON()} onLogout={this.logout.bind(this)} />
            <Container className={`${css.main} py-2`} fluid="xl">
              <Switch>
                <Route path="/" exact>
                  <Home />
                </Route>
                <Route path="/about" component={About} />
                <Route path="/login">
                  <Login {...props} />
                </Route>
                <AuthRoute path="/tickets" exact>
                  <Tickets {...props} />
                </AuthRoute>
                <AuthRoute path="/tickets/new">
                  <NewTicket {...props} />
                </AuthRoute>
                <AuthRoute path="/tickets/:nid">
                  <Ticket {...props} />
                </AuthRoute>
                <AuthRoute path="/notifications">
                  <Notification {...props} />
                </AuthRoute>
                <StaffRoute path="/customerService">
                  <CustomerService />
                </StaffRoute>
                <AuthRoute path="/users/:username">
                  <User {...props} />
                </AuthRoute>
                <AuthRoute path="/settings">
                  <Settings {...props} />
                </AuthRoute>
                <Route path="/error" component={ErrorPage} />
                <Route path="*" component={NotFound} />
              </Switch>
            </Container>
          </AppContext.Provider>
        )}
        <ServerNotification currentUser={this.state.currentUser} />
        <NotificationSystem ref="notificationSystem" />
      </>
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
  refreshTagMetadatas: PropTypes.func,
}

export default withRouter(App)

// TODO: 重构为 hooks
class ServerNotification extends Component {
  constructor(props) {
    super(props)
    let permission = 'denied'
    if (window.Notification && window.Notification.permission === 'granted') {
      permission = 'granted'
    } else if (window.Notification && window.Notification.permission !== 'denied') {
      window.Notification.requestPermission((status) => {
        if (window.Notification.permission !== status) {
          window.Notification.permission = status
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
    this.messageLiveQuery?.unsubscribe()
    if (!this.props.currentUser) {
      return
    }

    return db
      .class('Message')
      .where('to', '==', this.props.currentUser)
      .where('isRead', '==', false)
      .subscribe()
      .then((liveQuery) => {
        this.messageLiveQuery = liveQuery
        liveQuery.on('create', (message) => {
          return message.get({ include: ['ticket'] }).then((message) => {
            const messageType = message.get('type')
            const ticket = message.get('ticket')
            if (messageType == 'newTicket') {
              this.notify({
                title: i18next.t('message.newTicket'),
                body: `${ticket.get('title')} (#${ticket.get('nid')})`,
              })
            } else if (messageType == 'changeAssignee') {
              this.notify({
                title: i18next.t('message.assignTicket'),
                body: `${ticket.get('title')} (#${ticket.get('nid')})`,
              })
            } else if (messageType == 'reply') {
              this.notify({
                title: i18next.t('message.newReply'),
                body: `${ticket.get('title')} (#${ticket.get('nid')})`,
              })
            }
            return
          })
        })
        return
      })
  }

  componentWillUnmount() {
    this.messageLiveQuery?.unsubscribe()
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
    return null
  }
}

ServerNotification.propTypes = {
  currentUser: PropTypes.object,
}
