import React from 'react'
import AV from 'leancloud-storage'

export default React.createClass({
  getInitialState() {
    return {
      username: '',
      password: '',
    }
  },
  handleUsernameChange(e) {
    this.setState({username: e.target.value})
  },
  handlePasswordChange(e) {
    this.setState({password: e.target.value})
  },
  handleLogin() {
    new AV.User()
    .setUsername(this.state.username)
    .setPassword(this.state.password)
    .logIn();
  },
  handleSignup() {
    new AV.User()
    .setUsername(this.state.username)
    .setPassword(this.state.password)
    .signUp();
  },
  render() {
    return <div>
      <h2>Login or Signup</h2>
      <div><span>username: </span><input type="text" value={this.state.username} onChange={this.handleUsernameChange}/></div>
      <div><span>password: </span><input type="text" value={this.state.password} onChange={this.handlePasswordChange} /></div>
      <button type="submit" onClick={this.handleLogin}>Login</button>
      <button type="submit" onClick={this.handleSignup}>Signup</button>
    </div>
  }
})
