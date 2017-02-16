import React, { Component } from 'react'
import { Link } from 'react-router'
import AV from 'leancloud-storage'

export default React.createClass({
  handleLogout() {
    AV.User.logOut();
  },
  render() {
    let user;
    if (AV.User.current()) {
      user = (
        <li className="dropdown">
          <a href="#" className="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{AV.User.current().get('username')} <span className="caret"></span></a>
          <ul className="dropdown-menu">
            <li><Link to="/profile">个人信息</Link></li>
            <li role="separator" className="divider"></li>
            <li><a href="/settings">设置</a></li>
            <li><a href="#" onClick={this.handleLogout}>登出</a></li>
          </ul>
        </li>
      )
    } else {
      user = <li><Link to="/login">Login</Link></li>
    }
    return (
      <nav className="navbar navbar-default">
        <div className="container-fluid">
          <div className="navbar-header">
            <a className="navbar-brand" href="/">LeanTicket</a>
          </div>
      
          <div className="collapse navbar-collapse">
            <ul className="nav navbar-nav">
              <li><Link to="/tickets">Tickets</Link></li>
              <li><Link to="/about">About</Link></li>
            </ul>
            <ul className="nav navbar-nav navbar-right">
              {user}
            </ul>
          </div>
        </div>
      </nav>
    )
  }
})
