import React, {Component} from 'react'
import {ControlLabel, FormControl, FormGroup, Button} from 'react-bootstrap'
import PropTypes from 'prop-types'
import AV from 'leancloud-storage/live-query'
import css from './Login.css'

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
      return AV.User.become(query.token)
      .then((user) => {
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
      .then((user) => {
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
    .then((user) => {
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
    return AV.User.signUp(
      this.state.username,
      this.state.password,
      {name: this.state.username})
    .then((user) => {
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
    this.setState({username: e.target.value})
  }

  handlePasswordChange(e) {
    this.setState({password: e.target.value})
  }

  render() {
    return <div className={css.wrap}>
      <h1 className='font-logo'>登录或注册</h1>
      <hr />
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
          <Button type='button' bsStyle='primary' onClick={this.handleLogin.bind(this)}>登录</Button>
          {' '}
          <Button type='button' onClick={this.handleSignup.bind(this)}>注册</Button>
        </FormGroup>
      </form>
    </div>
  }

}

Login.propTypes = {
  location: PropTypes.object,
  onLogin: PropTypes.func,
}

Login.contextTypes = {
  router: PropTypes.object,
  addNotification: PropTypes.func.isRequired,
}
