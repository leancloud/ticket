import React, {Component} from 'react'
import { Link } from 'react-router'
import {Table, ButtonGroup, Button} from 'react-bootstrap'
import moment from 'moment'
import AV from 'leancloud-storage'
import css from './CustomerServiceTickets.css'

import {TICKET_STATUS} from '../lib/constant'
import {sortTickets, UserLabel, TicketStatusLabel, TicketReplyLabel} from './common'

export default class CustomerServiceTickets extends Component {

  constructor(props) {
    super(props)
    this.state = {
      tickets: [],
      userFilter: {assignee: AV.User.current()},
      statusFilters: [TICKET_STATUS.NEW, TICKET_STATUS.PENDING],
    }
  }

  refreshTickets() {
    return this.findTickets(this.state.userFilter, this.state.statusFilters)
    .then((tickets) => {
      this.setState({tickets})
    })
  }

  componentDidMount () {
    this.refreshTickets()
  }

  findTickets(userFilter, statusFilters) {
    let query = new AV.Query('Ticket')
    if (statusFilters) {
      const queryFilters = statusFilters.map((status) => {
        return new AV.Query('Ticket').equalTo('status', status)
      })
      query = AV.Query.or(...queryFilters)
    }
    if (userFilter.author) {
      query.equalTo('author', userFilter.author)
    }
    if (userFilter.assignee) {
      query.equalTo('assignee', userFilter.assignee)
    }
    return query.include('author')
    .include('assignee')
    .descending('createdAt')
    .find()
  }

  setUserFilter(userFilter) {
    this.findTickets(userFilter, this.state.statusFilters)
      .then((tickets) => {
        this.setState({tickets, userFilter})
      })
  }

  setStatusFilter(statusFilters) {
    this.findTickets(this.state.userFilter, statusFilters)
      .then((tickets) => {
        this.setState({tickets, statusFilters})
      })
  }

  render() {
    const tickets = sortTickets(this.state.tickets)
    const ticketTrs = tickets.map((ticket) => {
      const customerServices = (ticket.get('joinedCustomerServices') || []).map((user) => {
        return (
          <span key={user.objectId}><UserLabel user={user} /> </span>
        )
      })
      const joinedCustomerServices = <p className="list-group-item-text">{customerServices}</p>
      return (
        <tr key={ticket.get('nid')}>
          <td><Link to={'/tickets/' + ticket.get('nid')}>{ticket.get('nid')}</Link></td>
          <td><Link to={'/tickets/' + ticket.get('nid')}>{ticket.get('title')}</Link></td>
          <td>{ticket.get('category').name}</td>
          <td><TicketStatusLabel status={ticket.get('status')} /> <TicketReplyLabel ticket={ticket} /></td>
          <td><UserLabel user={ticket.get('author')} /></td>
          <td><UserLabel user={ticket.get('assignee')} /></td>
          <td>{ticket.get('replyCount') || <span className='label label-warning'>0</span>}</td>
          <td>{joinedCustomerServices}</td>
          <td>{moment(ticket.get('createdAt')).fromNow()}</td>
        </tr>
      )
    })
    const ticketAdminFilters = (
      <div>
        <div className="form-group">
          <ButtonGroup>
            <button className="btn btn-default" onClick={() => this.setStatusFilter([TICKET_STATUS.NEW, TICKET_STATUS.PENDING])}>未完成</button>
            <button className="btn btn-default" onClick={() => this.setStatusFilter([TICKET_STATUS.PRE_FULFILLED, TICKET_STATUS.FULFILLED, TICKET_STATUS.REJECTED])}>已完成</button>
          </ButtonGroup>
          {' '}
          <ButtonGroup>
            <Button onClick={() => this.setUserFilter({assignee: AV.User.current()})}>分配给我的</Button>
            <Button onClick={() => this.setUserFilter({})}>全部</Button>
          </ButtonGroup>
        </div>
      </div>
    )
    if (ticketTrs.length === 0) {
      ticketTrs.push(
        <tr key='0'>
          <td colSpan='7'>未查询到相关工单</td>
        </tr>
      )
    }
    return (
      <div>
        {ticketAdminFilters}
        <div className="panel panel-default">
          <Table striped bordered condensed hover>
            <thead>
              <tr>
                <th>编号</th>
                <th>标题</th>
                <th>分类</th>
                <th>状态</th>
                <th>提交人</th>
                <th>责任人</th>
                <th>回复次数</th>
                <th>参与人</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {ticketTrs}
            </tbody>
          </Table>
        </div>
      </div>
    )
  }

}
