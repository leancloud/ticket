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
import AV from 'leancloud-storage/live-query'
import { isCN } from './common'
import css from './Login.css'

export default class Login extends Component {
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
      return AV.User.become(query.token)
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
      return AV.User.become(query.token)
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

  handleLogin() {
    return AV.User.logIn(this.state.username, this.state.password)
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
    return AV.User.signUp(this.state.username, this.state.password, {
      name: this.state.username
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
    if (USE_OAUTH === 'false') {
      return (
        <div className={css.wrap}>
          <h1 className="font-logo">登录或注册</h1>
          <hr />
          <form>
            <FormGroup>
              <ControlLabel>用户名</ControlLabel>
              <FormControl
                type="text"
                value={this.state.username}
                onChange={this.handleUsernameChange.bind(this)}
              />
            </FormGroup>
            <FormGroup>
              <ControlLabel>密码</ControlLabel>
              <FormControl
                type="password"
                value={this.state.password}
                onChange={this.handlePasswordChange.bind(this)}
              />
            </FormGroup>
            <FormGroup>
              <Button
                type="button"
                bsStyle="primary"
                onClick={this.handleLogin.bind(this)}
              >
                登录
              </Button>{' '}
              <Button type="button" onClick={this.handleSignup.bind(this)}>
                注册
              </Button>
            </FormGroup>
          </form>
        </div>
      )
    }

    return (
      <div className={css.wrap}>
        <h1 className="font-logo">欢迎回来</h1>
        <hr />
        <p>目前只支持通过 {ORG_NAME} OAuth 授权进行登录</p>
        <Form action="/oauth/login" method="post">
          <input type="hidden" name="region" value={LEANCLOUD_OAUTH_REGION} />
          <FormGroup>
            <Button type="submit" bsStyle="primary">
              前往 {ORG_NAME} 授权页
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
  onLogin: PropTypes.func
}

Login.contextTypes = {
  router: PropTypes.object,
  addNotification: PropTypes.func.isRequired
}
