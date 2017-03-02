import React from 'react'
import { Link } from 'react-router'
import AV from 'leancloud-storage'

import {TICKET_STATUS_OPEN, TICKET_STATUS_CLOSED} from '../lib/constant'

export default React.createClass({
  getInitialState() {
    return {
      tickets: [],
      statusFilter: TICKET_STATUS_OPEN,
    }
  },
  componentDidMount() {
    this.findTickets(this.state.statusFilter).then((tickets) => {
      this.setState({tickets})
    })
  },
  setStatusFilter(statusFilter) {
    this.findTickets(statusFilter)
    .then((tickets) => {
      this.setState({tickets, statusFilter})
    })
  },
  findTickets(statusFilter) {
    return new AV.Query('Ticket')
    .equalTo('author', AV.User.current())
    .equalTo('status', statusFilter)
    .descending('createdAt')
    .find()
  },
  render() {
    const ticketLinks = this.state.tickets.map((ticket) => {
      let latestReply = ticket.get('latestReply')
      let latestReplyContent = latestReply ? latestReply.content : ''
      if (latestReplyContent.length > 200) {
        latestReplyContent = latestReplyContent.slice(0, 200) + '……'
      }
      const isCustomerServiceReply = latestReply ? latestReply.isCustomerService : false
      return (
        <li className="list-group-item" key={ticket.get('nid')}>
          <span className="badge">{ticket.get('replyCount')}</span>
          <h4 className="list-group-item-heading">
            <Link to={`/tickets/${ticket.get('nid')}`}>#{ticket.get('nid')} {ticket.get('title')}</Link> <small>{isCustomerServiceReply ? '已回复' : '未回复'}</small>
          </h4>
          <p className="list-group-item-text">{latestReplyContent}</p>
        </li>
      )
    })
    if (ticketLinks.length === 0) {
      ticketLinks.push(
        <li className="list-group-item" key={0}>未查询到相关工单，您可以 <Link to='/tickets/new'>新建工单</Link></li>
      )
    }
    return (
      <div>
        <div className="panel panel-default">
          <div className="panel-heading">
            <button className="btn btn-default" onClick={() => this.setStatusFilter(TICKET_STATUS_OPEN)}>打开的</button> <button className="btn btn-default" onClick={() => this.setStatusFilter(TICKET_STATUS_CLOSED)}>关闭的</button>
          </div>
          <ul className="list-group">
            {ticketLinks}
          </ul>
        </div>
      </div> 
    )
  }
})
