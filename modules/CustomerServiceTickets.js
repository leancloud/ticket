import React, {Component} from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Link } from 'react-router'
import {Form, FormGroup, ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem, Checkbox, FormControl, Pager} from 'react-bootstrap'
import qs from 'query-string'
import moment from 'moment'
import AV from 'leancloud-storage/live-query'
import css from './CustomerServiceTickets.css'
import DocumentTitle from 'react-document-title'

import {UserLabel, TicketStatusLabel, getCustomerServices, getCategoreisTree, depthFirstSearchMap, depthFirstSearchFind, getNodeIndentString, getNodePath} from './common'
import {TICKET_STATUS, TICKET_STATUS_MSG, ticketOpenedStatuses, ticketClosedStatuses} from '../lib/common'

let authorSearchTimeoutId

export default class CustomerServiceTickets extends Component {

  constructor(props) {
    super(props)
    this.state = {
      tickets: [],
      customerServices: [],
      categoriesTree: [],
    }
  }

  componentDidMount () {
    const authorId = this.props.location.query.authorId
    Promise.all([
      getCustomerServices(),
      getCategoreisTree(),
      authorId && new AV.Query('_User').get(authorId),
    ])
    .then(([customerServices, categoriesTree, author]) => {
      this.setState({customerServices, categoriesTree, authorUsername: author && author.get('username')})
      return this.findTickets(this.props.location.query)
    })
    .catch(this.context.addNotification)
  }

  componentWillReceiveProps(nextProps) {
    this.findTickets(nextProps.location.query)
    .catch(this.context.addNotification)
  }

  findTickets(filters) {
    if (_.keys(filters).length === 0) {
      this.updateFilter({
        assigneeId: AV.User.current().id,
        isOpen: 'true',
      })
      return Promise.resolve()
    }

    const {assigneeId, isOpen, status, categoryId, authorId, isOnlyUnlike, page = '0', size = '10'} = filters
    const query = new AV.Query('Ticket')
    
    let statuses = []
    if (isOpen === 'true') {
      statuses = ticketOpenedStatuses()
      query.addAscending('status')
    } else if (isOpen === 'false') {
      statuses = ticketClosedStatuses()
    } else if (status) {
      statuses = [parseInt(status)]
    }

    if (statuses.length !== 0) {
      query.containedIn('status', statuses)
    }

    if (assigneeId) {
      query.equalTo('assignee', AV.Object.createWithoutData('_User', assigneeId))
    }

    if (authorId) {
      query.equalTo('author', AV.Object.createWithoutData('_User', authorId))
    }

    if (categoryId) {
      query.equalTo('category.objectId', categoryId)
    }

    if (JSON.parse(isOnlyUnlike || false)) {
      query.equalTo('evaluation.star', 0)
    }

    return query.include('author')
    .include('assignee')
    .limit(parseInt(size))
    .skip(parseInt(page) * parseInt(size))
    .addDescending('updatedAt')
    .find()
    .then(tickets => {
      this.setState({tickets})
      return
    })
  }

  updateFilter(filter) {
    if (!filter.page && !filter.size) {
      filter.page = '0'
      filter.size = '10'
    }
    this.context.router.push(this.getQueryUrl(filter))
  }

  getQueryUrl(filter) {
    const filters = _.assign({}, this.props.location.query, filter)
    return this.props.location.pathname + '?' + qs.stringify(filters)
  }

  handleAuthorChange(e) {
    const username = e.target.value
    this.setState({
      authorFilterValidationState: null,
      authorUsername: username,
    })

    if (authorSearchTimeoutId) {
      clearTimeout(authorSearchTimeoutId)
    }
    authorSearchTimeoutId = setTimeout(() => {
      if (username.trim() === '') {
        this.setState({authorFilterValidationState: 'null'})
        const filters = _.assign({}, this.props.location.query, {authorId: null})
        return this.updateFilter(filters)
      }

      AV.Cloud.run('getUserInfo', {username})
      .then((user) => {
        authorSearchTimeoutId = null
        if (!user) {
          this.setState({authorFilterValidationState: 'error'})
          return
        } else {
          this.setState({authorFilterValidationState: 'success'})
          const filters = _.assign({}, this.props.location.query, {authorId: user.objectId})
          return this.updateFilter(filters)
        }
      })
      .catch(this.context.addNotification)
    }, 500)
  }

  handleUnlikeChange(e) {
    this.updateFilter({isOnlyUnlike: e.target.checked})
  }

  handleFiltersCommit(e) {
    e.preventDefault()
  }

  render() {
    const filters = this.props.location.query
    const tickets = this.state.tickets
    const ticketTrs = tickets.map((ticket) => {
      const customerServices = _.uniqBy(ticket.get('joinedCustomerServices') || [], 'objectId').map((user) => {
        return (
          <span key={user.objectId}><UserLabel user={user} /> </span>
        )
      })
      const joinedCustomerServices = <span>{customerServices}</span>
      const category = depthFirstSearchFind(this.state.categoriesTree, c => c.id == ticket.get('category').objectId)
      return (
        <div className={css.ticket} key={ticket.get('nid')}>
          <div className={css.heading}>
            <div className={css.left}>
              <Link className={css.title} to={'/tickets/' + ticket.get('nid')}>{ticket.get('title')}</Link>
              {getNodePath(category).map(c => {
                return <Link key={c.id} to={this.getQueryUrl({categoryId: c.id})}><span className={css.category}>{c.get('name')}</span></Link>
              })}
              {filters.isOpen === 'true' ||
                <span>{ticket.get('evaluation') && (ticket.get('evaluation').star === 1 && <span className={css.satisfaction + ' ' + css.happy}>满意</span> || <span className={css.satisfaction + ' ' + css.unhappy}>不满意</span>)}</span>
              }
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
              <span className={css.nid}>#{ticket.get('nid')}</span>
              <Link className={css.statusLink} to={this.getQueryUrl({status: ticket.get('status'), isOpen: undefined})}><span className={css.status}><TicketStatusLabel status={ticket.get('status')} /></span></Link>
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

    const statusMenuItems = _.keys(TICKET_STATUS).map(key => {
      const value = TICKET_STATUS[key]
      return <MenuItem key={value} eventKey={value}>{TICKET_STATUS_MSG[value]}</MenuItem>
    })
    const assigneeMenuItems = this.state.customerServices.map((user) => {
      return <MenuItem key={user.id} eventKey={user.id}>{user.get('username')}</MenuItem>
    })
    const categoryMenuItems = depthFirstSearchMap(this.state.categoriesTree, c => {
      return <MenuItem key={c.id} eventKey={c.id}>{getNodeIndentString(c) + c.get('name')}</MenuItem>
    })

    let statusTitle
    if (filters.status) {
      statusTitle = TICKET_STATUS_MSG[filters.status]
    } else if (filters.isOpen === 'true') {
      statusTitle = '未完成'
    } else if (filters.isOpen === 'false') {
      statusTitle = '已完成'
    } else {
      statusTitle = '全部状态'
    }

    let assigneeTitle
    if (filters.assigneeId) {
      const assignee = this.state.customerServices.find(user => user.id === filters.assigneeId)
      if (assignee) {
        assigneeTitle = assignee.get('username')
      } else {
        assigneeTitle = 'assigneeId 错误'
      }
    } else {
      assigneeTitle = '全部客服'
    }

    let categoryTitle
    if (filters.categoryId) {
      const category = depthFirstSearchFind(this.state.categoriesTree, c => c.id === filters.categoryId)
      if (category) {
        categoryTitle = category.get('name')
      } else {
        categoryTitle = 'categoryId 错误'
      }
    } else {
      categoryTitle = '全部分类'
    }

    const ticketAdminFilters = (
      <Form inline className='form-group' onSubmit={this.handleFiltersCommit.bind(this)}>
        <FormGroup>
          <ButtonToolbar>
            <ButtonGroup>
              <button className={'btn btn-default' + (filters.isOpen === 'true' ? ' active' : '')} onClick={() => this.updateFilter({isOpen: true, status: undefined})}>未完成</button>
              <button className={'btn btn-default' + (filters.isOpen === 'false' ? ' active' : '')} onClick={() => this.updateFilter({isOpen: false, status: undefined})}>已完成</button>
              <DropdownButton className={(typeof filters.isOpen === 'undefined' ? ' active' : '')} id='statusDropdown' title={statusTitle} onSelect={(eventKey) => this.updateFilter({status: eventKey, isOpen: undefined})}>
                <MenuItem key='undefined'>全部状态</MenuItem>
                {statusMenuItems}
              </DropdownButton>
            </ButtonGroup>
            <ButtonGroup>
              <Button className={(filters.assigneeId === AV.User.current().id ? ' active' : '')} onClick={() => this.updateFilter({assigneeId: AV.User.current().id})}>分配给我的</Button>
              <DropdownButton className={(typeof filters.assigneeId === 'undefined' || filters.assigneeId && filters.assigneeId !== AV.User.current().id ? ' active' : '')} id='assigneeDropdown' title={assigneeTitle} onSelect={(eventKey) => this.updateFilter({assigneeId: eventKey})}>
                <MenuItem key='undefined'>全部客服</MenuItem>
                {assigneeMenuItems}
              </DropdownButton>
            </ButtonGroup>
            <ButtonGroup>
              <DropdownButton className={(filters.categoryId ? ' active' : '')} id='categoryDropdown' title={categoryTitle} onSelect={(eventKey) => this.updateFilter({categoryId: eventKey})}>
                <MenuItem key='undefined'>全部分类</MenuItem>
                {categoryMenuItems}
              </DropdownButton>
            </ButtonGroup>
          </ButtonToolbar>
        </FormGroup>
        {'  '}
        <FormGroup validationState={this.state.authorFilterValidationState}>
          <FormControl type="text" value={this.state.authorUsername} placeholder="提交人" onChange={this.handleAuthorChange.bind(this)} />
        </FormGroup>
        {'  '}
        {filters.isOpen === 'true' ||
          <ButtonGroup>
            <Checkbox checked={filters.isOnlyUnlike === 'true'} onChange={this.handleUnlikeChange.bind(this)}>只看差评</Checkbox>
          </ButtonGroup>
        }
      </Form>
    )
    if (ticketTrs.length === 0) {
      ticketTrs.push(
        <div key='0'>
          未查询到相关工单
        </div>
      )
    }
    return (
      <div>
        <DocumentTitle title='客服工单列表 - LeanTicket' />
        {ticketAdminFilters}

        {ticketTrs}

        <Pager>
          <Pager.Item disabled={filters.page === '0'} previous onClick={() => this.updateFilter({page: (parseInt(filters.page) - 1) + ''})}>&larr; 上一页</Pager.Item>
          <Pager.Item disabled={parseInt(filters.size) !== this.state.tickets.length} next onClick={() => this.updateFilter({page: (parseInt(filters.page) + 1) + ''})}>下一页 &rarr;</Pager.Item>
        </Pager>
      </div>
    )
  }

}

CustomerServiceTickets.propTypes = {
  location: PropTypes.object.isRequired,
}

CustomerServiceTickets.contextTypes = {
  router: PropTypes.object.isRequired,
  addNotification: PropTypes.func.isRequired,
}
