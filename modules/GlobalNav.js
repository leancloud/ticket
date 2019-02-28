import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'

export default class GlobalNav extends Component {

  handleNewTicketClick() {
    this.context.router.push('/tickets/new')
  }

  render() {
    let user
    if (this.props.currentUser) {
      user = (
        <li className="dropdown">
          <a href="#" className="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{this.props.currentUser.get('name')} <span className="caret"></span></a>
          <ul className="dropdown-menu">
            <li><Link to="/settings">设置</Link></li>
            <li><a href="#" onClick={() => this.props.logout()}>登出</a></li>
          </ul>
        </li>
      )
    } else {
      user = <li><Link to="/login">登录</Link></li>
    }
    let createTicket
    if (this.props.currentUser) {
      createTicket = (
        <li>
          <button type="submit" className='btn btn-success navbar-btn nav-submit-btn' onClick={this.handleNewTicketClick.bind(this)}>新建工单</button>
        </li>
      )
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
      <nav className="navbar navbar-default navbar-fixed-top">
        <div className="container">
          <div className="navbar-header">
            <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#global-navbar-collapse" aria-expanded="false">
              <span className="sr-only">Toggle navigation</span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
            </button>
            <Link className="navbar-brand font-logo" to='/'>LeanTicket</Link>
          </div>
          <div className="collapse navbar-collapse" id="global-navbar-collapse">
            <ul className="nav navbar-nav">
              <li><Link to="/tickets">工单列表</Link></li>
              <li><Link to="/about">关于</Link></li>
            </ul>
            {customerServiceLinks}
            <ul className="nav navbar-nav navbar-right">
              {createTicket}
              {user}
            </ul>
          </div>
        </div>
      </nav>
    )
  }

}

GlobalNav.contextTypes = {
  router: PropTypes.object.isRequired
}

GlobalNav.propTypes = {
  currentUser: PropTypes.object,
  isCustomerService: PropTypes.bool,
  logout: PropTypes.func.isRequired,
}
