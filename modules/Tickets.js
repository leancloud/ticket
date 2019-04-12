import React, {Component} from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Link } from 'react-router'
import { Pager, Checkbox, Form, DropdownButton, MenuItem } from 'react-bootstrap'
import moment from 'moment'
import AV from 'leancloud-storage/live-query'
import css from './CustomerServiceTickets.css'
import DocumentTitle from 'react-document-title'

import {UserLabel, TicketStatusLabel, getCategoryPathName, getCategoriesTree, OrganizationSelect, getTicketAcl} from './common'

export default class Tickets extends Component {

  constructor(props) {
    super(props)
    this.state = {
      organization: null,
      categoriesTree: [],
      tickets: [],
      batchOpsEnable: false,
      checkedTickets: new Set(),
      isCheckedAll: false,
      filters: {
        page: 0,
        size: 20,
      },
    }
  }

  componentDidMount () {
    getCategoriesTree(false)
    .then(categoriesTree => {
      this.setState({categoriesTree})
      this.findTickets({organizationId: this.props.selectedOrgId})
      return
    })
    .catch(this.props.addNotification)
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.selectedOrgId !== nextProps.selectedOrgId) {
      this.findTickets({organizationId: nextProps.selectedOrgId})
    }
  }

  findTickets(filter) {
    const filters = _.assign({}, this.state.filters, filter)
    let query
    if (filter.organizationId) {
      query = new AV.Query('Ticket')
      query.equalTo('organization', _.find(this.props.organizations, {id: filter.organizationId}))
    } else {
      const q1 = new AV.Query('Ticket').doesNotExist('organization')
      const q2 = new AV.Query('Ticket').equalTo('organization', null)
      query = AV.Query.or(q1, q2)
      query.equalTo('author', AV.User.current())
    }
    query.include('author')
    .include('assignee')
    .limit(filters.size)
    .skip(filters.page * filters.size)
    .descending('createdAt')
    .find()
    .then((tickets) => {
      this.setState({tickets, filters})
      return
    })
    .catch(this.props.addNotification)
  }

  handleClickCheckbox(e) {
    const checkedTickets = this.state.checkedTickets
    if (e.target.checked) {
      checkedTickets.add(e.target.value)
    } else {
      checkedTickets.delete(e.target.value)
    }
    this.setState({checkedTickets, isCheckedAll: checkedTickets.size == this.state.tickets.length})
  }

  handleClickCheckAll(e) {
    if (e.target.checked) {
      this.setState({checkedTickets: new Set(this.state.tickets.map(t => t.id)), isCheckedAll: true})
    } else {
      this.setState({checkedTickets: new Set(), isCheckedAll: false})
    }
  }

  handleBatchOps(batchOpsEnable) {
    this.setState({batchOpsEnable})
  }

  handleTicketsMove(organization) {
    const tickets = _.filter(this.state.tickets, t => this.state.checkedTickets.has(t.id))
    tickets.forEach(t => {
      if (organization) {
        t.set('organization', organization)
      } else {
        t.unset('organization')
      }
      t.setACL(getTicketAcl(t.get('author'), organization))
    })
    AV.Object.saveAll(tickets).then(() => {
      this.setState({checkedTickets: new Set(), isCheckedAll: false})
      this.findTickets({organizationId: this.props.selectedOrgId})
      return
    })
    .catch(this.props.addNotification)
  }

  render() {
    const ticketLinks = this.state.tickets.map((ticket) => {
      const customerServices = _.uniqBy(ticket.get('joinedCustomerServices') || [], 'objectId').map((user) => {
        return (
          <span key={user.objectId}><UserLabel user={user} /> </span>
        )
      })
      const joinedCustomerServices = <span>{customerServices}</span>
      return (
        <div className={`${css.ticket} ${css.row}`} key={ticket.get('nid')}>
          {this.state.batchOpsEnable && <Checkbox className={css.ticketSelectCheckbox} onClick={this.handleClickCheckbox.bind(this)} value={ticket.id} checked={this.state.checkedTickets.has(ticket.id)}></Checkbox>}
          <div className={css.ticketContent}>
            <div className={css.heading}>
              <div className={css.left}>
                <span className={css.nid}>#{ticket.get('nid')}</span>
                <Link className={css.title} to={'/tickets/' + ticket.get('nid')}>{ticket.get('title')}</Link>
                <span className={css.category}>{getCategoryPathName(ticket.get('category'), this.state.categoriesTree)}</span>
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
        {this.props.organizations.length > 0 && <Form inline>
          {this.state.batchOpsEnable
            && <div>
              <Checkbox className={css.ticketSelectCheckbox} onClick={this.handleClickCheckAll.bind(this)} checked={this.state.isCheckedAll}> 全选</Checkbox>
              {' '}
              <TicketsMoveButton selectedOrgId={this.props.selectedOrgId}
                organizations={this.props.organizations}
                onTicketsMove={this.handleTicketsMove.bind(this)}
              />
              {' '}
              <button className='btn btn-link' onClick={() => this.handleBatchOps(false)}>返回</button>
            </div>
            || <div>
              <OrganizationSelect organizations={this.props.organizations}
                selectedOrgId={this.props.selectedOrgId}
                onOrgChange={this.props.handleOrgChange} />
              {' '}
              <DropdownButton title='' id='tickets-ops'>
                <MenuItem onClick={() => this.handleBatchOps(true)}>批量操作</MenuItem>
              </DropdownButton>
            </div>
          }
        </Form>}
        {ticketLinks}
        <Pager>
          <Pager.Item disabled={this.state.filters.page === 0} previous onClick={() => this.findTickets({page: this.state.filters.page - 1, organizationId: this.props.selectedOrgId})}>&larr; 上一页</Pager.Item>
          <Pager.Item disabled={this.state.filters.size !== this.state.tickets.length} next onClick={() => this.findTickets({page: this.state.filters.page + 1, organizationId: this.props.selectedOrgId})}>下一页 &rarr;</Pager.Item>
        </Pager>
      </div>
    )
  }
}

Tickets.propTypes = {
  organizations: PropTypes.array,
  handleOrgChange: PropTypes.func,
  selectedOrgId: PropTypes.string,
  addNotification: PropTypes.func,
}

const TicketsMoveButton = (props) => {
  let items
  if (props.selectedOrgId == '') {
    items = props.organizations.map(org => {
      return <MenuItem key={org.id} onClick={() => props.onTicketsMove(org)}>组织：{org.get('name')}</MenuItem>
    })
  } else {
    items = _.reject(props.organizations, {id: props.selectedOrgId}).map(org => {
      return <MenuItem key={org.id} onClick={() => props.onTicketsMove(org)}>组织：{org.get('name')}</MenuItem>
    })
    items.push(<MenuItem key={'author'} onClick={() => props.onTicketsMove()}>创建者名下</MenuItem>)
  }
  return <DropdownButton title='工单转移到' id='tickets-move'>
    {items}
  </DropdownButton>
}

TicketsMoveButton.propTypes = {
  organizations: PropTypes.array,
  selectedOrgId: PropTypes.string,
  onTicketsMove: PropTypes.func,
}
