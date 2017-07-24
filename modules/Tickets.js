import React, {Component} from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'
import { Pager } from 'react-bootstrap'
import moment from 'moment'
import AV from 'leancloud-storage/live-query'
import css from './CustomerServiceTickets.css'
import DocumentTitle from 'react-document-title'

import {UserLabel, TicketStatusLabel} from './common'

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
    .include('author')
    .include('assignee')
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
    const ticketLinks = this.state.tickets.map((ticket) => {
      let latestReply = ticket.get('latestReply')
      let latestReplyContent = ''
      if (latestReply && latestReply.content) {
        let latestReplyContent = latestReply.content
        if (latestReplyContent.length > 200) {
          latestReplyContent = latestReplyContent.slice(0, 200) + '……'
        }
      }
      const customerServices = (ticket.get('joinedCustomerServices') || []).map((user) => {
        return (
          <span key={user.objectId}><UserLabel user={user} /> </span>
        )
      })
      const joinedCustomerServices = <span>{customerServices}</span>
      return (
        <div className={css.ticket} key={ticket.get('nid')}>
          <div className={css.heading}>
            <div className={css.left}>
              <span className={css.nid}>#{ticket.get('nid')}</span>
              <Link className={css.title} to={'/tickets/' + ticket.get('nid')}>{ticket.get('title')}</Link>
              <span className={css.category}>{ticket.get('category').name}</span>
            </div>
            <div className={css.right}>
              {ticket.get('replyCount') &&
                <Link className={css.commentCounter} title={'reply ' + ticket.get('replyCount')} to={'/tickets/' + ticket.get('nid')}>
                  <span className={css.commentCounterIcon + ' glyphicon glyphicon-comment'}></span>
                  {ticket.get('replyCount')}
                </Link>
              }
            </div>
          </div>

          <div className={css.meta}>
            <div className={css.left}>
              <span className={css.status}><TicketStatusLabel status={ticket.get('status')} /></span>
              <span className={css.creator}><UserLabel user={ticket.get('author')} /></span> 创建于 {moment(ticket.get('createdAt')).fromNow()}
              {moment(ticket.get('createdAt')).fromNow() === moment(ticket.get('updatedAt')).fromNow() ||
                <span>，更新于 {moment(ticket.get('updatedAt')).fromNow()}</span>
              }
            </div>
            <div className={css.right}>
              <span className={css.assignee}><UserLabel user={ticket.get('assignee')} /></span>
              <span className={css.contributors}>{joinedCustomerServices}</span>
            </div>
          </div>
        </div>
      )
    })
    if (ticketLinks.length === 0) {
      ticketLinks.push(
        <div key={0}>未查询到相关工单，您可以 <Link to='/tickets/new'>新建工单</Link></div>
      )
    }
    return (
      <div>
        <DocumentTitle title='工单列表 - LeanTicket' />
        {ticketLinks}
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
