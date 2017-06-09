import React, {Component} from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'
import {Table, ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem, Checkbox} from 'react-bootstrap'
import moment from 'moment'
import AV from 'leancloud-storage'

import {sortTickets, UserLabel, TicketStatusLabel, getCustomerServices, ticketOpenedStatuses, ticketClosedStatuses} from './common'

export default class CustomerServiceTickets extends Component {

  constructor(props) {
    super(props)
    this.state = {
      tickets: [],
      customerServices: [],
      categories: [],
      filters: {
        user: {assignee: AV.User.current()},
        isOpen: true,
        category: null,
        isOnlyUnlike: false,
      },
    }
  }

  componentDidMount () {
    Promise.all([
      this.findTickets(this.state.filters),
      getCustomerServices(),
      new AV.Query('Category')
        .descending('createdAt')
        .find(),
    ])
    .then(([tickets, customerServices, categories]) => {
      this.setState({tickets, customerServices, categories})
    })
    .catch(this.props.addNotification)
  }

  findTickets({user, isOpen, category, isOnlyUnlike}) {
    let query = new AV.Query('Ticket')

    const queryFilters = (isOpen? ticketOpenedStatuses() : ticketClosedStatuses())
    .map((status) => {
      return new AV.Query('Ticket').equalTo('status', status)
    })
    query = AV.Query.or(...queryFilters)

    if (user.author) {
      query.equalTo('author', user.author)
    }
    if (user.assignee) {
      query.equalTo('assignee', user.assignee)
    }

    if (category) {
      query.equalTo('category.objectId', category.id)
    }

    if (isOnlyUnlike) {
      query.equalTo('evaluation.star', 0)
    }

    return query.include('author')
    .include('assignee')
    .descending('createdAt')
    .find()
  }

  updateFilter(filter) {
    const filters = Object.assign({}, this.state.filters, filter)
    this.findTickets(filters)
    .then((tickets) => {
      this.setState({tickets, filters})
    })
    .catch(this.props.addNotification)
  }

  handleUnlikeChange(e) {
    this.updateFilter({isOnlyUnlike: e.target.checked})
  }

  render() {
    const tickets = sortTickets(this.state.tickets)
    const filters = this.state.filters
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
          {filters.isOpen ||
            <td>{ticket.get('evaluation') && (ticket.get('evaluation').star === 1 && <span className="glyphicon glyphicon-thumbs-up" aria-hidden="true"></span> || <span className="glyphicon glyphicon-thumbs-down" aria-hidden="true"></span>)}</td>
          }
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
          <button className={'btn btn-default' + (filters.isOpen ? ' active' : '')} onClick={() => this.updateFilter({isOpen: true})}>未完成</button>
          <button className={'btn btn-default' + (filters.isOpen ? '' : ' active')} onClick={() => this.updateFilter({isOpen: false})}>已完成</button>
        </ButtonGroup>
        <ButtonGroup>
          <Button onClick={() => this.updateFilter({user: {assignee: AV.User.current()}})}>分配给我的</Button>
          <DropdownButton title={filters.user.assignee ? filters.user.assignee.get('username') : '全部责任人'} onSelect={(eventKey) => this.updateFilter({user: {assignee: eventKey}})}>
            <MenuItem>全部负责人</MenuItem>
            {assigneeMenuItems}
          </DropdownButton>
        </ButtonGroup>
        <ButtonGroup>
          <DropdownButton title={filters.category ? filters.category.get('name') : '全部分类'} onSelect={(eventKey) => this.updateFilter({category: eventKey})}>
            <MenuItem>全部分类</MenuItem>
            {categoryMenuItems}
          </DropdownButton>
        </ButtonGroup>
        {filters.isOpen ||
          <ButtonGroup>
            <Checkbox checked={filters.isOnlyUnlike} onChange={this.handleUnlikeChange.bind(this)}>只看差评</Checkbox>
          </ButtonGroup>
        }
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
        {ticketAdminFilters}
        <div className="panel panel-default">
          <Table striped bordered condensed hover>
            <thead>
              <tr>
                <th>编号</th>
                <th>标题</th>
                <th>分类</th>
                <th>状态</th>
                {filters.isOpen || <th>评价</th>}
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

CustomerServiceTickets.propTypes = {
  addNotification: PropTypes.func.isRequired,
}
