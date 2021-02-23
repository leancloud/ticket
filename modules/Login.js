/*global ORG_NAME, USE_OAUTH, LEANCLOUD_OAUTH_REGION*/
import React, { Component } from 'react'
import { withTranslation } from 'react-i18next'
import {
  ControlLabel,
  FormControl,
  FormGroup,
  Form,
  Button
} from 'react-bootstrap'
import PropTypes from 'prop-types'
import qs from 'query-string'
import { auth } from '../lib/leancloud'
import { isCN } from './common'
import css from './Login.css'
import { withRouter } from 'react-router'

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
    if (auth.currentUser()) {
      this.props.history.push('/')
      return
    }

    const { token } = qs.parse(this.props.location.search)
    if (token) {
      return auth.loginWithSessionToken(token)
        .then(user => {
          this.props.onLogin(user)
          this.props.history.replace('/')
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
      this.props.history.replace(location.state.nextPathname)
    } else {
      this.props.history.replace('/')
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
          /* eslint-disable i18n/no-chinese-character */
          <div>
            <hr />
            <p>美味书签（北京）信息技术有限公司 版权所有</p>
            <div>
              <a href="https://beian.miit.gov.cn/" target="_blank">
                京ICP备12025059号-10
              </a>
            </div>
          </div>
          /* eslint-enable i18n/no-chinese-character */
        )}
      </div>
    )
  }
}

Login.propTypes = {
  history: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  onLogin: PropTypes.func,
  t: PropTypes.func
}

Login.contextTypes = {
  addNotification: PropTypes.func.isRequired
}

export default withTranslation()(withRouter(Login))
