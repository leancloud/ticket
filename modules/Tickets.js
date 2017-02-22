import React from 'react'
import { Link } from 'react-router'
import _ from 'lodash'
import AV from 'leancloud-storage'

import {TICKET_STATUS_OPEN} from '../lib/constant'
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
  },
  findTickets(params) {
    const query = new AV.Query('Ticket')
    if (params.author) {
      const innerQuery = new AV.Query('_User')
        .equalTo('username', params.author)
      query.matchesQuery('author', innerQuery)
    }
    if (params.assignee) {
      const innerQuery = new AV.Query('_User')
        .equalTo('username', params.assignee)
      query.matchesQuery('assignee', innerQuery)
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
      return (
        <li className="list-group-item" key={ticket.get('nid')}><Link to={`/tickets/${ticket.get('nid')}`}>#{ticket.get('nid')} {ticket.get('title')}</Link></li>
      )
    })
    let ticketFilters
    if (this.state.isCustomerService) {
      ticketFilters = (
        <ul className="nav nav-tabs">
          <li role="presentation"><Link to={'/tickets?author=' + AV.User.current().get('username')}>我创建的</Link></li>
          <li role="presentation"><Link to={'/tickets?assignee=' + AV.User.current().get('username')}>分配给我的</Link></li>
          <li role="presentation"><Link to={'/tickets'}>全部</Link></li>
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
            {ticketFilters}
            <ul className="list-group">
              {ticketLinks}
            </ul>
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
