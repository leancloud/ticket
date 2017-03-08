import React from 'react'
import { Link } from 'react-router'
import AV from 'leancloud-storage'

import {TICKET_STATUS} from '../lib/constant'
const common = require('./common')

export default React.createClass({
  getInitialState() {
    return {
      tickets: [],
      userFilter: {author: AV.User.current()},
      statusFilter: null,
    }
  },
  refreshTickets(props) {
    let userFilter, statusFilter
    if (props.isCustomerService) {
      userFilter = {assignee: AV.User.current()}
      statusFilter = TICKET_STATUS.OPEN
    } else {
      userFilter = {author: AV.User.current()}
      statusFilter = null
    }
    return this.findTickets(userFilter, statusFilter)
    .then((tickets) => {
      this.setState({tickets, userFilter, statusFilter})
    })
  },
  componentDidMount () {
    this.refreshTickets(this.props)
  },
  componentWillReceiveProps(nextProps) {
    this.refreshTickets(nextProps)
  }, 
  findTickets(userFilter, statusFilter) {
    const query = new AV.Query('Ticket')
    if (userFilter.author) {
      query.equalTo('author', userFilter.author)
    }
    if (userFilter.assignee) {
      query.equalTo('assignee', userFilter.assignee)
    }
    if (statusFilter) {
      query.equalTo('status', statusFilter)
    }
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
  render() {
    const ticketLinks = this.state.tickets.map((ticket) => {
      let latestReply = ticket.get('latestReply')
      let latestReplyContent = latestReply ? latestReply.content : ''
      if (latestReplyContent.length > 200) {
        latestReplyContent = latestReplyContent.slice(0, 200) + '……'
      }
      let joinedCustomerServices
      if (this.props.isCustomerService) {
        const customerServices = (ticket.get('joinedCustomerServices') || []).map((user) => {
          return (
            <span key={user.objectId}>{common.userLabel(user)} </span>
          )
        })
        joinedCustomerServices = <p className="list-group-item-text">{customerServices}</p>
      }
      return (
        <li className="list-group-item" key={ticket.get('nid')}>
          <span className="badge">{ticket.get('replyCount')}</span>
          <h4 className="list-group-item-heading">
            <Link to={`/tickets/${ticket.get('nid')}`}>#{ticket.get('nid')} {ticket.get('title')}</Link> <small>{common.getTicketStatusLabel(ticket)}</small>
          </h4>
          <p className="list-group-item-text">{latestReplyContent}</p>
          {joinedCustomerServices}
        </li>
      )
    })
    let ticketAdminFilters
    if (this.props.isCustomerService) {
      ticketAdminFilters = (
        <div>
          <div className="form-group">
            <button className="btn btn-default" onClick={() => this.setUserFilter({assignee: AV.User.current()})}>分配给我的</button>
            <button className="btn btn-default" onClick={() => this.setUserFilter({})}>全部</button>
          </div>
          <div className="form-group">
            <button className="btn btn-default" onClick={() => this.setStatusFilter(TICKET_STATUS.OPEN)}>打开的</button>
            <button className="btn btn-default" onClick={() => this.setStatusFilter(TICKET_STATUS.PRE_FULFILLED)}>待确认已解决的</button>
            <button className="btn btn-default" onClick={() => this.setStatusFilter(TICKET_STATUS.FULFILLED)}>已解决的</button>
            <button className="btn btn-default" onClick={() => this.setStatusFilter(TICKET_STATUS.REJECTED)}>关闭的</button>
          </div>
        </div>
      )
    }
    if (ticketLinks.length === 0) {
      ticketLinks.push(
        <li className="list-group-item" key={0}>未查询到相关工单，您可以 <Link to='/tickets/new'>新建工单</Link></li>
      )
    }
    return (
      <div>
        {ticketAdminFilters}
        <div className="panel panel-default">
          <ul className="list-group">
            {ticketLinks}
          </ul>
        </div>
      </div> 
    )
  }
})
