import React, { Component } from 'react'
import { Link } from 'react-router'
import AV from 'leancloud-storage'
import Notification from './notification'

export default React.createClass({
  handleLogout() {
    AV.User.logOut()
    Notification.logout()
  },
  handleNewTicketClick() {
    this.context.router.push('/tickets/new')
  },
  contextTypes: {
    router: React.PropTypes.object
  },
  render() {
    let user
    if (AV.User.current()) {
      user = (
        <li className="dropdown">
          <a href="#" className="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{AV.User.current().get('username')} <span className="caret"></span></a>
          <ul className="dropdown-menu">
            <li><Link to="/profile">个人信息</Link></li>
            <li role="separator" className="divider"></li>
            <li><Link to="/settings">设置</Link></li>
            <li><a href="#" onClick={this.handleLogout}>登出</a></li>
          </ul>
        </li>
      )
    } else {
      user = <li><Link to="/login">Login</Link></li>
    }
    let customerServiceLinks
    if (this.props.isCustomerService) {
      customerServiceLinks = (
        <ul className="nav navbar-nav">
          <li><Link to="/customerService/tickets">客服工单列表</Link></li>
          <li><Link to="/customerService/stats">统计</Link></li>
        </ul>
      )
    }
    return (
      <nav className="navbar navbar-default">
        <div className="container-fluid">
          <div className="navbar-header">
            <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#global-navbar-collapse" aria-expanded="false">
              <span className="sr-only">Toggle navigation</span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
            </button>
            <a className="navbar-brand" href="/">LeanTicket</a>
          </div>
          <div className="collapse navbar-collapse" id="global-navbar-collapse">
            <ul className="nav navbar-nav">
              <li><Link to="/tickets">工单列表</Link></li>
              <li><Link to="/about">关于</Link></li>
            </ul>
            {customerServiceLinks}
            <ul className="nav navbar-nav navbar-right">
              <li>
                <button type="submit" className="btn btn-primary navbar-btn" onClick={this.handleNewTicketClick}>新建工单</button>
              </li>
              {user}
            </ul>
          </div>
        </div>
      </nav>
    )
  }
})
