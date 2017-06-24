import React, {Component} from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'
import { Pager } from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

import {sortTicketsForCustomer, TicketStatusLabel} from './common'

export default class Tickets extends Component {
  
  constructor(props) {
    super(props)
    this.state = {
      tickets: [],
      filters: {
        page: 0,
        size: 20,
      },
    }
  }

  componentDidMount () {
    this.findTickets({})
  }

  findTickets(filter) {
    const filters = Object.assign({}, this.state.filters, filter)
    return new AV.Query('Ticket')
    .equalTo('author', AV.User.current())
    .limit(filters.size)
    .skip(filters.page * filters.size)
    .descending('createdAt')
    .find()
    .then((tickets) => {
      this.setState({tickets, filters})
    })
    .catch(this.props.addNotification)
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
        <Pager>
          <Pager.Item disabled={this.state.filters.page === 0} previous onClick={() => this.findTickets({page: this.state.filters.page - 1})}>&larr; 上一页</Pager.Item>
          <Pager.Item disabled={this.state.filters.size !== this.state.tickets.length} next onClick={() => this.findTickets({page: this.state.filters.page + 1})}>下一页 &rarr;</Pager.Item>
        </Pager>
      </div> 
    )
  }
}

Tickets.propTypes = {
  addNotification: PropTypes.func,
}
