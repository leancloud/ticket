import React, {Component} from 'react'
import { Link } from 'react-router'
import AV from 'leancloud-storage'

import {sortTicketsForCustomer, TicketStatusLabel} from './common'

export default class Tickets extends Component {
  
  constructor(props) {
    super(props)
    this.state = {
      tickets: [],
    }
  }

  refreshTickets() {
    return this.findTickets()
    .then((tickets) => {
      this.setState({tickets})
    })
  }

  componentDidMount () {
    this.refreshTickets(this.props)
  }

  componentWillReceiveProps(nextProps) {
    this.refreshTickets(nextProps)
  }

  findTickets() {
    return new AV.Query('Ticket')
    .equalTo('author', AV.User.current())
    .descending('createdAt')
    .find()
  }

  render() {
    const tickets = sortTicketsForCustomer(this.state.tickets)
    const ticketLinks = tickets.map((ticket) => {
      let latestReply = ticket.get('latestReply')
      let latestReplyContent = ''
      if (latestReply && latestReply.content) {
        let latestReplyContent = latestReply.content
        if (latestReplyContent.length > 200) {
          latestReplyContent = latestReplyContent.slice(0, 200) + '……'
        }
      }
      return (
        <li className="list-group-item" key={ticket.get('nid')}>
          <span className="badge">{ticket.get('replyCount')}</span>
          <h4 className="list-group-item-heading">
            <Link to={`/tickets/${ticket.get('nid')}`}>#{ticket.get('nid')} {ticket.get('title')}</Link> <small><TicketStatusLabel status={ticket.get('status')} /></small>
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
          <ul className="list-group">
            {ticketLinks}
          </ul>
        </div>
      </div> 
    )
  }
}
