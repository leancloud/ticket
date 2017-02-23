import React from 'react'
import { Link } from 'react-router'
import _ from 'lodash'
import qs from 'qs'
import AV from 'leancloud-storage'

import {TICKET_STATUS_OPEN, TICKET_STATUS_CLOSED} from '../lib/constant'
import common from './common'

export default React.createClass({
  getInitialState() {
    return {
      tickets: [],
      isCustomerService: false,
    }
  },
  componentDidMount() {
    this.findTickets(this.props.location.query)
      .then(() => {
        return common.isCustomerService(AV.User.current())
      }).then((isCustomerService) => {
        this.setState({isCustomerService})
      })
  },
  componentWillReceiveProps(nextProps) {
    if (nextProps.location.pathname !== '/tickets') {
      return
    }
    this.findTickets(nextProps.location.query)
      .then(() => {
        return common.isCustomerService(AV.User.current())
      }).then((isCustomerService) => {
        this.setState({isCustomerService})
      })
  },
  queryUrl(param) {
    const query = _.assign(this.props.location.query, param)
    return '/tickets?' + qs.stringify(query)
  },
  findTickets(params) {
    const query = new AV.Query('Ticket')
    if (params.author && params.author !== '*') {
      const innerQuery = new AV.Query('_User')
        .equalTo('username', params.author)
      query.matchesQuery('author', innerQuery)
    }
    if (params.assignee) {
      const innerQuery = new AV.Query('_User')
        .equalTo('username', params.assignee)
      query.matchesQuery('assignee', innerQuery)
    }
    if (params.status) {
      query.equalTo('status', parseInt(params.status))
    }
    return query.descending('updatedAt')
      .find()
      .then((tickets) => {
        this.setState({tickets})
      }).catch(alert)
  },
  handleTickerFilterChange(filter) {
    this.findTickets(filter)
  },
  contextTypes: {
    router: React.PropTypes.object
  },
  addTicket(ticket) {
    new AV.Object('Ticket').save({
      title: ticket.title,
      category: ticket.category,
      content: ticket.content,
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
          <li role="presentation"><Link to={`/tickets?author=${AV.User.current().get('username')}&status=${TICKET_STATUS_OPEN}`}>我创建的</Link></li>
          <li role="presentation"><Link to={`/tickets?assignee=${AV.User.current().get('username')}&status=${TICKET_STATUS_OPEN}`}>分配给我的</Link></li>
          <li role="presentation"><Link to={`/tickets?status=${TICKET_STATUS_OPEN}`}>全部</Link></li>
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
                <Link to={this.queryUrl({status: TICKET_STATUS_OPEN})}>打开的</Link> <Link to={this.queryUrl({status: TICKET_STATUS_CLOSED})}>关闭的</Link>
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
