/*global ORG_NAME, USE_OAUTH, LEANCLOUD_OAUTH_REGION*/
import React, { Component } from 'react'
import {
  ControlLabel,
  FormControl,
  FormGroup,
  Form,
  Button
} from 'react-bootstrap'
import PropTypes from 'prop-types'
import { auth } from '../lib/leancloud'
import { isCN } from './common'
import css from './Login.css'
import translate from './i18n/translate'

class Login extends Component {
  constructor(props) {
    super(props)
    this.state = {
      username: '',
      password: '',
      error: ''
    }
  }

  componentDidMount() {
    const query = this.props.location.query
    if (query.token) {
      return auth.loginWithSessionToken(query.token)
        .then(user => {
          this.props.onLogin(user)
          return
        })
        .then(() => {
          this.context.router.push('/tickets')
          return
        })
        .catch(this.context.addNotification)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.location.pathname !== '/login') {
      return
    }
    const query = nextProps.location.query
    if (query.token) {
      return auth.loginWithSessionToken(query.token)
        .then(user => {
          this.props.onLogin(user)
          return
        })
        .then(() => {
          this.redirect(nextProps)
          return
        })
        .catch(this.context.addNotification)
    }
  }

  handleLogin(e) {
    e.preventDefault()
    return auth.login(this.state.username, this.state.password)
      .then(user => {
        this.props.onLogin(user)
        return
      })
      .then(() => {
        this.redirect(this.props)
        return
      })
      .catch(this.context.addNotification)
  }

  handleSignup() {
    return auth.signUp({
      username: this.state.username, 
      password: this.state.password,
      name: this.state.username,
    })
      .then(user => {
        this.props.onLogin(user)
        return
      })
      .then(() => {
        this.redirect(this.props)
        return
      })
      .catch(this.context.addNotification)
  }

  redirect(props) {
    const { location } = props
    if (location.state && location.state.nextPathname) {
      this.context.router.replace(location.state.nextPathname)
    } else {
      this.context.router.replace('/')
    }
  }

  handleUsernameChange(e) {
    this.setState({ username: e.target.value })
  }

  handlePasswordChange(e) {
    this.setState({ password: e.target.value })
  }

  render() {
    const {t} = this.props
    if (!USE_OAUTH) {
      return (
        <div className={css.wrap}>
          <h1 className="font-logo">{t('loginOrSignup')}</h1>
          <hr />
          <form onSubmit={this.handleLogin.bind(this)}>
            <FormGroup>
              <ControlLabel>{t('username')}</ControlLabel>
              <FormControl
                type="text"
                value={this.state.username}
                onChange={this.handleUsernameChange.bind(this)}
              />
            </FormGroup>
            <FormGroup>
              <ControlLabel>{t('password')}</ControlLabel>
              <FormControl
                type="password"
                value={this.state.password}
                onChange={this.handlePasswordChange.bind(this)}
              />
            </FormGroup>
            <FormGroup>
              <Button
                type="submit"
                bsStyle="primary"
              >
                {t('login')} 
              </Button>{' '}
              <Button type="button" onClick={this.handleSignup.bind(this)}>
                {t('signup')}
              </Button>
            </FormGroup>
          </form>
        </div>
      )
    }
    return (
      <div className={css.wrap}>
        <h1 className="font-logo">{t('welcome')}</h1>
        <hr />
        <p>{t('currentlyOnlySupports')} {ORG_NAME} OAuth {t('oauthAuthentication')}</p>
        <Form action="/oauth/login" method="post">
          <input type="hidden" name="region" value={LEANCLOUD_OAUTH_REGION} />
          <FormGroup>
            <Button type="submit" bsStyle="primary">
              {t('goto')} {ORG_NAME} {t('oauthPage')}
            </Button>
          </FormGroup>
        </Form>
        {isCN() && (
          <div>
            <hr />
            <p>美味书签（北京）信息技术有限公司 版权所有</p>
            <div>
              <a href="https://beian.miit.gov.cn/" target="_blank">
                京ICP备12025059号-10
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }
}

Login.propTypes = {
  location: PropTypes.object,
  onLogin: PropTypes.func,
  t: PropTypes.func
}

Login.contextTypes = {
  router: PropTypes.object,
  addNotification: PropTypes.func.isRequired
}

export default translate(Login)
