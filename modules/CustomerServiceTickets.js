import React, {Component} from 'react'
import { Link } from 'react-router'
import {Table, ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem} from 'react-bootstrap'
import moment from 'moment'
import AV from 'leancloud-storage'

import {TICKET_STATUS} from '../lib/constant'
import {sortTickets, UserLabel, TicketStatusLabel, getCustomerServices} from './common'

export default class CustomerServiceTickets extends Component {

  constructor(props) {
    super(props)
    this.state = {
      tickets: [],
      customerServices: [],
      categories: [],
      userFilter: {assignee: AV.User.current()},
      statusFilters: [TICKET_STATUS.NEW, TICKET_STATUS.WAITING_CUSTOMER_SERVICE, TICKET_STATUS.WAITING_CUSTOMER],
      categoryFilter: null,
    }
  }

  componentDidMount () {
    Promise.all([
      this.findTickets(this.state.userFilter, this.state.statusFilters, this.state.categoryFilter),
      getCustomerServices(),
      new AV.Query('Category')
        .descending('createdAt')
        .find(),
    ])
    .then(([tickets, customerServices, categories]) => {
      this.setState({tickets, customerServices, categories})
    })
  }

  findTickets(userFilter, statusFilters, categoryFilter) {
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
    if (categoryFilter) {
      query.equalTo('category.objectId', categoryFilter.id)
    }
    return query.include('author')
    .include('assignee')
    .descending('createdAt')
    .find()
  }

  setUserFilter(userFilter) {
    this.findTickets(userFilter, this.state.statusFilters, this.state.categoryFilter)
      .then((tickets) => {
        this.setState({tickets, userFilter})
      })
  }

  setStatusFilter(statusFilters) {
    this.findTickets(this.state.userFilter, statusFilters, this.state.categoryFilter)
      .then((tickets) => {
        this.setState({tickets, statusFilters})
      })
  }

  setCategoryFilter(categoryFilter) {
    this.findTickets(this.state.userFilter, this.state.statusFilters, categoryFilter)
    .then((tickets) => {
      this.setState({tickets, categoryFilter})
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
          <td><TicketStatusLabel status={ticket.get('status')} /></td>
          <td><UserLabel user={ticket.get('author')} /></td>
          <td><UserLabel user={ticket.get('assignee')} /></td>
          <td>{ticket.get('replyCount') || <span className='label label-warning'>0</span>}</td>
          <td>{joinedCustomerServices}</td>
          <td>{moment(ticket.get('createdAt')).fromNow()}</td>
        </tr>
      )
    })
    const assigneeMenuItems = this.state.customerServices.map((user) => {
      return <MenuItem eventKey={user}>{user.get('username')}</MenuItem>
    })
    const categoryMenuItems = this.state.categories.map((category) => {
      return <MenuItem eventKey={category}>{category.get('name')}</MenuItem>
    })
    const ticketAdminFilters = (
      <ButtonToolbar>
        <ButtonGroup>
          <button className="btn btn-default" onClick={() => this.setStatusFilter([TICKET_STATUS.NEW, TICKET_STATUS.WAITING_CUSTOMER_SERVICE, TICKET_STATUS.WAITING_CUSTOMER])}>未完成</button>
          <button className="btn btn-default" onClick={() => this.setStatusFilter([TICKET_STATUS.PRE_FULFILLED, TICKET_STATUS.FULFILLED, TICKET_STATUS.REJECTED])}>已完成</button>
        </ButtonGroup>
        <ButtonGroup>
          <Button onClick={() => this.setUserFilter({assignee: AV.User.current()})}>分配给我的</Button>
          <DropdownButton title={this.state.userFilter.assignee.get('username')} onSelect={(eventKey) => this.setUserFilter({assignee: eventKey})}>
            {assigneeMenuItems}
          </DropdownButton>
          <Button onClick={() => this.setUserFilter({})}>全部</Button>
        </ButtonGroup>
        <ButtonGroup>
          <DropdownButton title={this.state.categoryFilter ? this.state.categoryFilter.get('name') : '选择分类'} onSelect={(eventKey) => this.setCategoryFilter(eventKey)}>
            {categoryMenuItems}
          </DropdownButton>
          <Button onClick={() => this.setCategoryFilter()}>全部</Button>
        </ButtonGroup>
      </ButtonToolbar>
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
        <p>
          {ticketAdminFilters}
        </p>
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
