/*global ORG_NAME, USE_OAUTH*/
import React, {Component} from 'react'
import {ControlLabel, FormControl, FormGroup, Button} from 'react-bootstrap'
import PropTypes from 'prop-types'
import AV from 'leancloud-storage/live-query'

export default class Login extends Component {

  constructor(props) {
    super(props)
    this.state = {
      username: '',
      password: '',
      error: '',
    }
  }

  componentDidMount() {
    const query = this.props.location.query
    if (query.token) {
      AV.User.become(query.token).then(() => {
        this.context.router.push('/tickets')
      })
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.location.pathname !== '/login') {
      return
    }
    const query = nextProps.location.query
    if (query.token) {
      return AV.User.become(query.token)
      .then((user) => {
        this.props.onLogin(user)
      })
      .then(() => {
        this.redirect(nextProps)
      })
      .catch(this.context.addNotification)
    }
  }

  handleLogin() {
    return AV.User.logIn(this.state.username, this.state.password)
    .then((user) => {
      this.props.onLogin(user)
    })
    .then(() => {
      this.redirect(this.props)
    })
    .catch(this.context.addNotification)
  }

  handleSignup() {
    return new AV.User()
    .setUsername(this.state.username)
    .setPassword(this.state.password)
    .signUp()
    .then((user) => {
      this.props.onLogin(user)
    })
    .then(() => {
      this.redirect(this.props)
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
    this.setState({username: e.target.value})
  }

  handlePasswordChange(e) {
    this.setState({password: e.target.value})
  }

  render() {
    if (USE_OAUTH === 'false') {
      return <div>
        <h1>登录或注册</h1>
        <form>
          <FormGroup>
            <ControlLabel>用户名</ControlLabel>
            <FormControl type='text' value={this.state.username} onChange={this.handleUsernameChange.bind(this)} />
          </FormGroup>
          <FormGroup>
            <ControlLabel>密码</ControlLabel>
            <FormControl type='password' value={this.state.password} onChange={this.handlePasswordChange.bind(this)} />
          </FormGroup>
          <FormGroup>
            <Button type='button' onClick={this.handleLogin.bind(this)}>登录</Button>
            {' '}
            <Button type='button' onClick={this.handleSignup.bind(this)}>注册</Button>
          </FormGroup>
        </form>
      </div>
    }

    return <div>
      <h1>登录或注册</h1>
      <p>目前只支持通过 {ORG_NAME} OAuth 授权进行登录和注册。</p>
      <a href='/oauth/login' className='btn btn-primary'>前往 {ORG_NAME} 授权页</a>
    </div>
  }

}

Login.propTypes = {
  location: PropTypes.object,
  onLogin: PropTypes.func.isRequired,
}

Login.contextTypes = {
  router: PropTypes.func.isRequired,
  addNotification: PropTypes.func.isRequired,
}
