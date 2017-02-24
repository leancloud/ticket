import React from 'react'
import { Link } from 'react-router'
import _ from 'lodash'
import AV from 'leancloud-storage'

import {TICKET_STATUS_OPEN, TICKET_STATUS_CLOSED} from '../lib/constant'
import common from './common'

export default React.createClass({
  getInitialState() {
    return {
      tickets: [],
      isCustomerService: false,
      userFilter: {},
      statusFilter: TICKET_STATUS_OPEN,
    }
  },
  componentDidMount() {
    let userFilter, isCustomerService
    common.isCustomerService(AV.User.current()).then((_isCustomerService) => {
      isCustomerService = _isCustomerService
      if (isCustomerService) {
        userFilter = {assignee: AV.User.current()}
      } else {
        userFilter = {author: AV.User.current()}
      }
      return this.findTickets(userFilter, this.state.statusFilter)
    }).then((tickets) => {
      this.setState({tickets, isCustomerService, userFilter})
    })
  },
  findTickets(userFilter, statusFilter) {
    const query = new AV.Query('Ticket')
    if (!_.isEqual(userFilter, {})) {
      if (userFilter.author) {
        query.equalTo('author', userFilter.author)
      }
      if (userFilter.assignee) {
        query.equalTo('assignee', userFilter.assignee)
      }
    }
    query.equalTo('status', statusFilter)
    return query.descending('createdAt').find()
  },
  setUserFilter(userFilter) {
    this.findTickets(userFilter, this.state.statusFilter)
      .then((tickets) => {
        this.setState({tickets, userFilter})
      })
  },
  setStatusFilter(statusFilter) {
    this.findTickets(this.state.userFilter, statusFilter)
      .then((tickets) => {
        this.setState({tickets, statusFilter})
      })
  },
  contextTypes: {
    router: React.PropTypes.object
  },
  addTicket(ticket) {
    new AV.Object('Ticket').save({
      title: ticket.title,
      category: ticket.category,
      content: ticket.content,
      files: ticket.files,
      status: TICKET_STATUS_OPEN,
    }).then((ticket) => {
      return ticket.fetch({
        keys: 'nid',
      })
    }).then((ticket) => {
      const tickets = this.state.tickets
      tickets.unshift(ticket)
      this.setState({tickets})
      this.context.router.push('/tickets/' + ticket.get('nid'))
    }).catch(alert)
  },
  render() {
    const ticketLinks = this.state.tickets.map((ticket) => {
      let latestReply = ticket.get('latestReply')
      let latestReplyContent = latestReply ? latestReply.content : ''
      if (latestReplyContent.length > 40) {
        latestReplyContent = latestReplyContent.slice(0, 40) + '……'
      }
      const isCustomerServiceReply = latestReply ? latestReply.isCustomerService : false
      const joinedCustomerServices = (ticket.get('joinedCustomerServices') || []).map((user) => {
        return (
          <span key={user.objectId}>{common.userLabel(user)} </span>
        )
      })
      return (
        <li className="list-group-item" key={ticket.get('nid')}>
          <span className="badge">{ticket.get('replyCount')}</span>
          <h4 className="list-group-item-heading">
            <Link to={`/tickets/${ticket.get('nid')}`}>#{ticket.get('nid')} {ticket.get('title')}</Link> <small>{isCustomerServiceReply ? '已回复' : '未回复'}</small>
          </h4>
          <p className="list-group-item-text">{latestReplyContent}</p>
          <p className="list-group-item-text">{joinedCustomerServices}</p>
        </li>
      )
    })
    let ticketAdminFilters
    if (this.state.isCustomerService) {
      ticketAdminFilters = (
        <ul className="nav nav-tabs">
          <li role="presentation"><button className="btn btn-default" onClick={() => this.setUserFilter({author: AV.User.current()})}>我创建的</button></li>
          <li role="presentation"><button className="btn btn-default" onClick={() => this.setUserFilter({assignee: AV.User.current()})}>分配给我的</button></li>
          <li role="presentation"><button className="btn btn-default" onClick={() => this.setUserFilter({})}>全部</button></li>
        </ul>
      )
    }
    if (ticketLinks.length === 0) {
      ticketLinks.push(
        <li className="list-group-item" key={0}>未查询到相关工单，您可以 <Link to='/tickets/new'>新建工单</Link></li>
      )
    }
    return (
      <div>
        <div className="row">
          <div className="col-sm-4">
            {ticketAdminFilters}
            <div className="panel panel-default">
              <div className="panel-heading">
                <button className="btn btn-default" onClick={() => this.setStatusFilter(TICKET_STATUS_OPEN)}>打开的</button> <button className="btn btn-default" onClick={() => this.setStatusFilter(TICKET_STATUS_CLOSED)}>关闭的</button>
              </div>
              <ul className="list-group">
                {ticketLinks}
              </ul>
            </div>
          </div> 
          <div className="col-sm-8">
            {this.props.children && React.cloneElement(this.props.children,
              {
                addTicket: this.addTicket,
              })
            }
          </div>
        </div>
      </div>
    )
  }
})
