import React, {Component} from 'react'
import PropTypes from 'prop-types'
import AV from 'leancloud-storage'

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
      this.props.loginByToken(query.token)
    }
  }

  handleLogin() {
    this.props.login(this.state.username, this.state.password)
  }

  handleUsernameChange(e) {
    this.setState({username: e.target.value})
  }

  handlePasswordChange(e) {
    this.setState({password: e.target.value})
  }

  handleSignup() {
    this.props.signup(this.state.username, this.state.password)
  }

  render() {
    return <div>
      <h1>登录或注册</h1>
      <p>目前只支持通过 LeanCloud OAuth 授权进行登录和注册。</p>
      <a href='/api/leancloud/login' className='btn btn-primary'>前往 LeanCloud 授权页</a>
      <hr />
      <h2>测试使用</h2>
      <div><span>username: </span><input type="text" value={this.state.username} onChange={this.handleUsernameChange.bind(this)}/></div>
      <div><span>password: </span><input type="password" value={this.state.password} onChange={this.handlePasswordChange.bind(this)} /></div>
      <button type="submit" onClick={this.handleLogin.bind(this)}>Login</button>
      <button type="submit" onClick={this.handleSignup.bind(this)}>Signup</button>
    </div>
  }

}

Login.propTypes = {
  location: PropTypes.object,
  loginByToken: PropTypes.func.isRequired,
  login: PropTypes.func.isRequired,
  signup: PropTypes.func.isRequired,
}
