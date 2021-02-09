import React, {Component} from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Link, withRouter } from 'react-router-dom'
import { Form, FormGroup, ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem, Checkbox, FormControl, Pager} from 'react-bootstrap'
import qs from 'query-string'
import moment from 'moment'
import {auth, cloud, db} from '../lib/leancloud'
import css from './CustomerServiceTickets.css'

import {getCustomerServices, getCategoriesTree, depthFirstSearchMap, depthFirstSearchFind, getNodeIndentString, getNodePath, getTinyCategoryInfo, getCategoryName} from './common'
import {TICKET_STATUS, TICKET_STATUS_MSG, ticketOpenedStatuses, ticketClosedStatuses, TIME_RANGE_MAP} from '../lib/common'
import TicketStatusLabel from './TicketStatusLabel'
import {UserLabel} from './UserLabel'
import translate from './i18n/translate'
import {userDisplayName} from '../config.webapp'
import {DocumentTitle} from './utils/DocumentTitle'

let authorSearchTimeoutId
class CustomerServiceTickets extends Component {

  constructor(props) {
    super(props)
    this.state = {
      tickets: [],
      customerServices: [],
      categoriesTree: [],
      checkedTickets: new Set(),
      isCheckedAll: false,
    }
  }

  componentDidMount () {
    const filters = qs.parse(this.props.location.search)
    const { authorId } = filters
    Promise.all([
      getCustomerServices(),
      getCategoriesTree(false),
      authorId && db.class('_User').object(authorId).get(),
    ])
    .then(([customerServices, categoriesTree, author]) => {
      this.setState({customerServices, categoriesTree, authorUsername: author && author.get('username')})
      return this.findTickets(filters)
    })
    .catch(this.context.addNotification)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.location.search !== this.props.location.search) {
      this.findTickets(qs.parse(this.props.location.search))
        .catch(this.context.addNotification)
    }
  }

  findTickets(filters) {
    if (_.keys(filters).length === 0) {
      this.updateFilter({
        assigneeId: auth.currentUser().id,
        isOpen: 'true',
      })
      return Promise.resolve()
    }

    const {assigneeId, isOpen, status, categoryId, authorId,
      tagKey, tagValue, isOnlyUnlike, searchString, page = '0', size = '10', timeRange} = filters
    let query = db.class('Ticket')

    let statuses = []
    if (isOpen === 'true') {
      statuses = ticketOpenedStatuses()
      query = query.orderBy('status')
    } else if (isOpen === 'false') {
      statuses = ticketClosedStatuses()
    } else if (status) {
      statuses = [parseInt(status)]
    }

    if(timeRange){
      query = query
        .where('createdAt', '>=', TIME_RANGE_MAP[timeRange].starts)
        .where('createdAt', '<', TIME_RANGE_MAP[timeRange].ends)
    }

    if (statuses.length !== 0) {
      query = query.where('status', 'in', statuses)
    }

    if (assigneeId) {
      query = query.where('assignee', '==', db.class('_User').object(assigneeId))
    }

    if (authorId) {
      query = query.where('author', '==', db.class('_User').object(authorId))
    }

    if (categoryId) {
      query = query.where('category.objectId', '==', categoryId)
    }

    if (tagKey) {
      const tagMetadata = _.find(this.context.tagMetadatas, m => m.get('key') == tagKey)
      if (tagMetadata) {
        const columnName = tagMetadata.get('isPrivate') ? 'privateTags' : 'tags'
        if (tagValue) {
          query = query.where(columnName, '==', {key: tagKey, value: tagValue})
        } else {
          query = query.where(columnName + '.key', '==', tagKey)
        }
      }
    }

    if (JSON.parse(isOnlyUnlike || false)) {
      query = query.where('evaluation.star', '==', 0)
    }

    return Promise.resolve()
    .then(() => {
      if (searchString && searchString.trim().length > 0) {
        return Promise.all([
          db.search('Ticket').queryString(`title:*${searchString}* OR content:*${searchString}*`)
            .orderBy('latestReply.updatedAt', 'desc')
            .limit(1000)
            .find()
            .then(({data: tickets}) => {
              return tickets.map(t => t.id)
            }),
          db.search('Reply').queryString(`content:*${searchString}*`)
            .orderBy('latestReply.updatedAt', 'desc')
            .limit(1000)
            .find()
            .then(result => result.data)
        ])
      }
      return [[], []]
    })
    .then(([searchMatchedTicketIds, searchMatchedReplaies]) => {
      if (searchMatchedTicketIds.length + searchMatchedReplaies.length > 0) {
        const ticketIds = _.union(searchMatchedTicketIds, searchMatchedReplaies.map(r => r.get('ticket').id))
        query = query.where('objectId', 'in', ticketIds)
      }
      return query.include('author')
      .include('assignee')
      .limit(parseInt(size))
      .skip(parseInt(page) * parseInt(size))
      .orderBy('latestReply.updatedAt', 'desc')
      .orderBy('updatedAt', 'desc')
      .find()
      .then(tickets => {
        tickets.forEach(t => {
          t.replies = _.filter(searchMatchedReplaies, r => r.get('ticket').id == t.id)
        })
        this.setState({tickets})
        return
      })
    })
  }

  updateFilter(filter) {
    if (!filter.page && !filter.size) {
      filter.page = '0'
      filter.size = '10'
    }
    this.props.history.push(this.getQueryUrl(filter))
  }

  getQueryUrl(filter) {
    const filters = _.assign({}, qs.parse(this.props.location.search), filter)
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
        this.setState({authorFilterValidationState: null})
        const filters = _.assign({}, qs.parse(this.props.location.search), {authorId: null})
        return this.updateFilter(filters)
      }

      cloud.run('getUserInfo', {username})
      .then((user) => {
        authorSearchTimeoutId = null
        if (!user) {
          this.setState({authorFilterValidationState: 'error'})
          return
        } else {
          this.setState({authorFilterValidationState: 'success'})
          const filters = _.assign({}, qs.parse(this.props.location.search), {authorId: user.objectId})
          return this.updateFilter(filters)
        }
      })
      .catch(this.context.addNotification)
    }, 500)
  }

  handleUnlikeChange(e) {
    this.updateFilter({isOnlyUnlike: e.target.checked})
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

  handleChangeCategory(categoryId) {
    const tickets = _.filter(this.state.tickets, t => this.state.checkedTickets.has(t.id))
    const category = getTinyCategoryInfo(depthFirstSearchFind(this.state.categoriesTree, c => c.id == categoryId))
    const p = db.pipeline()
    tickets.forEach(t => p.update(t, {category}))
    p.commit()
    .then(() => {
      this.setState({isCheckedAll: false, checkedTickets: new Set()})
      this.updateFilter({})
      return
    })
    .catch(this.context.addNotification)
  }

  render() {
    const {t} = this.props
    const filters = qs.parse(this.props.location.search)
    const tickets = this.state.tickets
    const ticketTrs = tickets.map((ticket) => {
      const contributors = _.uniqBy(ticket.data.joinedCustomerServices || [], 'objectId')
      const category = depthFirstSearchFind(this.state.categoriesTree, c => c.id == ticket.data.category.objectId)

      return (
        <div className={`${css.ticket} ${css.row}`} key={ticket.get('nid')}>
          <Checkbox className={css.ticketSelectCheckbox} onChange={this.handleClickCheckbox.bind(this)} value={ticket.id} checked={this.state.checkedTickets.has(ticket.id)}></Checkbox>
          <div className={css.ticketContent}>
            <div className={css.heading}>
              <div className={css.left}>
                <Link className={css.title} to={'/tickets/' + ticket.get('nid')}>{ticket.get('title')}</Link>
                {getNodePath(category).map(c => {
                  return <Link key={c.id} to={this.getQueryUrl({categoryId: c.id})}><span className={css.category}>{getCategoryName(c, t)}</span></Link>
                })}
                {filters.isOpen === 'true' ||
                  <span>{ticket.get('evaluation') && (ticket.get('evaluation').star === 1 && <span className={css.satisfaction + ' ' + css.happy}>{t('satisfied')}</span> || <span className={css.satisfaction + ' ' + css.unhappy}>{t('unsatisfied')}</span>)}</span>
                }
              </div>
              <div>
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
                <span className={css.creator}><UserLabel user={ticket.data.author.data} displayTags /></span> {t('createdAt')} {moment(ticket.get('createdAt')).fromNow()}
                {moment(ticket.get('createdAt')).fromNow() === moment(ticket.get('updatedAt')).fromNow() ||
                  <span> {t('updatedAt')} {moment(ticket.get('updatedAt')).fromNow()}</span>
                }
              </div>
              <div>
                <span className={css.assignee}>
                  <UserLabel user={ticket.data.assignee.data} />
                </span>
                <span className={css.contributors}>
                  {contributors.map(user => (
                    <span key={user.objectId}><UserLabel user={user} /></span>
                  ))}
                </span>
              </div>
            </div>
            <BlodSearchString content={ticket.get('content')} searchString={filters.searchString}/>
            {ticket.replies.map(r => {
              return <BlodSearchString key={r.id} content={r.get('content')} searchString={filters.searchString}/>
            })}
          </div>
        </div>
      )
    })

    const statusMenuItems = _.keys(TICKET_STATUS).map(key => {
      const value = TICKET_STATUS[key]
      return <MenuItem key={value} eventKey={value}>{t(TICKET_STATUS_MSG[value])}</MenuItem>
    })
    const assigneeMenuItems = this.state.customerServices.map((user) => (
      <MenuItem key={user.id} eventKey={user.id}>
        {userDisplayName(user.data)}
      </MenuItem>
    ))
    const categoryMenuItems = depthFirstSearchMap(this.state.categoriesTree, c => {
      return <MenuItem key={c.id} eventKey={c.id}>{getNodeIndentString(c) + getCategoryName(c, t)}</MenuItem>
    })

    let statusTitle
    if (filters.status) {
      statusTitle = t(TICKET_STATUS_MSG[filters.status])
    } else if (filters.isOpen === 'true') {
      statusTitle = t('incompleted')
    } else if (filters.isOpen === 'false') {
      statusTitle = t('completed')
    } else {
      statusTitle = t('all')
    }

    let assigneeTitle
    if (filters.assigneeId) {
      const assignee = this.state.customerServices.find(user => user.id === filters.assigneeId)
      if (assignee) {
        assigneeTitle = userDisplayName(assignee.data)
      } else {
        assigneeTitle = `assigneeId ${t('invalid')}`
      }
    } else {
      assigneeTitle = t('all')
    }

    let categoryTitle
    if (filters.categoryId) {
      const category = depthFirstSearchFind(this.state.categoriesTree, c => c.id === filters.categoryId)
      if (category) {
        categoryTitle = getCategoryName(category, t)
      } else {
        categoryTitle = `categoryId ${t('invalid')}`
      }
    } else {
      categoryTitle = t('all')
    }

    const assignedToMe = auth.currentUser() && filters.assigneeId === auth.currentUser().id
    const ticketAdminFilters = (
      <div>
        <Form inline className='form-group'>
          <FormGroup>
            <DelayInputForm placeholder={t('searchKeyword')} value={filters.searchString} onChange={(value) => this.updateFilter({searchString: value})} />
          </FormGroup>
          {'  '}
          <FormGroup>
            <ButtonToolbar>
              <ButtonGroup>
                <Button className={'btn btn-default' + (filters.isOpen === 'true' ? ' active' : '')} onClick={() => this.updateFilter({isOpen: true, status: undefined})}>{t('incompleted')}</Button>
                <Button className={'btn btn-default' + (filters.isOpen === 'false' ? ' active' : '')} onClick={() => this.updateFilter({isOpen: false, status: undefined})}>{t('completed')}</Button>
                <DropdownButton className={(typeof filters.isOpen === 'undefined' ? ' active' : '')} id='statusDropdown' title={statusTitle} onSelect={(eventKey) => this.updateFilter({status: eventKey, isOpen: undefined})}>
                  <MenuItem key='undefined'>{t('all')}</MenuItem>
                  {statusMenuItems}
                </DropdownButton>
              </ButtonGroup>
              <ButtonGroup>
                <Button className={assignedToMe ? ' active' : ''} onClick={() => this.updateFilter({assigneeId: auth.currentUser().id})}>{t('assignedToMe')}</Button>
                <DropdownButton className={!assignedToMe ? ' active' : ''} id='assigneeDropdown' title={assigneeTitle} onSelect={(eventKey) => this.updateFilter({assigneeId: eventKey})}>
                  <MenuItem key='undefined'>{t('all')}</MenuItem>
                  {assigneeMenuItems}
                </DropdownButton>
              </ButtonGroup>
              <ButtonGroup>
                <DropdownButton className={(filters.categoryId ? ' active' : '')} id='categoryDropdown' title={categoryTitle} onSelect={(eventKey) => this.updateFilter({categoryId: eventKey})}>
                  <MenuItem key='undefined'>{t('all')}</MenuItem>
                  {categoryMenuItems}
                </DropdownButton>
              </ButtonGroup>
              <ButtonGroup>
                <DropdownButton className={(typeof filters.tagKey === 'undefined' || filters.tagKey ? ' active' : '')} id='tagKeyDropdown' title={filters.tagKey || t('all')} onSelect={(eventKey) => this.updateFilter({tagKey: eventKey, tagValue: undefined})}>
                  <MenuItem key='undefined'>{t('all')}</MenuItem>
                  {this.context.tagMetadatas.map(tagMetadata => {
                    const key = tagMetadata.get('key')
                    return <MenuItem key={key} eventKey={key}>{key}</MenuItem>
                  })}
                </DropdownButton>
                {filters.tagKey &&
                  <DropdownButton className={(typeof filters.tagValue === 'undefined' || filters.tagValue ? ' active' : '')} id='tagValueDropdown' title={filters.tagValue || t('allTagValues')} onSelect={(eventKey) => this.updateFilter({tagValue: eventKey})}>
                    <MenuItem key='undefined'>{t('allTagValues')}</MenuItem>
                    {this.context.tagMetadatas.length > 0 && _.find(this.context.tagMetadatas, m => m.get('key') == filters.tagKey).get('values').map(value => {
                      return <MenuItem key={value} eventKey={value}>{value}</MenuItem>
                    })}
                  </DropdownButton>
                }
              </ButtonGroup>
              <ButtonGroup>
                <DropdownButton
                  className={(filters.timeRange ? ' active' : '')}
                  id='timeRange'
                  title={TIME_RANGE_MAP[filters.timeRange]? t(filters.timeRange) : t('allTime')}
                  onSelect={(eventKey) => this.updateFilter({timeRange: eventKey})}
                >
                    <MenuItem key='undefined'>{t('allTime')}</MenuItem>
                    <MenuItem key='thisMonth' eventKey='thisMonth'>{t('thisMonth')}</MenuItem>
                    <MenuItem key='lastMonth' eventKey='lastMonth'>{t('lastMonth')}</MenuItem>
                    <MenuItem key='monthBeforeLast' eventKey='monthBeforeLast'>{t('monthBeforeLast')}</MenuItem>
                </DropdownButton>
              </ButtonGroup>
            </ButtonToolbar>
          </FormGroup>
          {'  '}

          <FormGroup validationState={this.state.authorFilterValidationState}>
            <FormControl type="text" value={this.state.authorUsername} placeholder={t('submitter')} onChange={this.handleAuthorChange.bind(this)} />
          </FormGroup>
          {'  '}
          {filters.isOpen === 'true' ||
            <ButtonGroup>
              <Checkbox checked={filters.isOnlyUnlike === 'true'} onChange={this.handleUnlikeChange.bind(this)}>{t('badReviewsOnly')}</Checkbox>
            </ButtonGroup>
          }
        </Form>
      </div>
    )

    const ticketCheckedOperations = (
      <FormGroup>
        <DropdownButton id='categoryMoveDropdown' title={t('changeCategory')} onSelect={this.handleChangeCategory.bind(this)}>
          {categoryMenuItems}
        </DropdownButton>
      </FormGroup>
    )

    if (ticketTrs.length === 0) {
      ticketTrs.push(
        <div className={css.ticket} key='0'>
          {t('notFound')}
        </div>
      )
    }

    let pager
    const isFirstPage = filters.page === '0'
    const isLastPage = parseInt(filters.size) !== this.state.tickets.length
    if (!(isFirstPage && isLastPage)) {
      pager = (
        <Pager>
          <Pager.Item disabled={isFirstPage} previous onClick={() => this.updateFilter({page: (parseInt(filters.page) - 1) + ''})}>&larr; {t('previousPage')}</Pager.Item>
          <Pager.Item disabled={isLastPage} next onClick={() => this.updateFilter({page: (parseInt(filters.page) + 1) + ''})}>{t('nextPage')} &rarr;</Pager.Item>
        </Pager>
      )
    }

    return (
      <div>
        <DocumentTitle title={`${t('customerServiceTickets')} - LeanTicket`} />
        <div className={css.row}>
          <Checkbox className={css.ticketSelectCheckbox} onChange={this.handleClickCheckAll.bind(this)} checked={this.state.isCheckedAll}></Checkbox>
          {this.state.checkedTickets.size && ticketCheckedOperations || ticketAdminFilters}
        </div>

        {ticketTrs}
        {pager}
      </div>
    )
  }

}

CustomerServiceTickets.propTypes = {
  history: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  t: PropTypes.func
}

CustomerServiceTickets.contextTypes = {
  addNotification: PropTypes.func.isRequired,
  tagMetadatas: PropTypes.array,
}

class DelayInputForm extends Component {

  constructor(props) {
    super(props)
    this.state = {
      value: props.value || '',
      timeoutId: null,
    }
  }

  handleChange(e) {
    const value = e.target.value
    if (this.state.timeoutId) {
      clearTimeout(this.state.timeoutId)
    }
    const timeoutId = setTimeout(() => {
      this.props.onChange(this.state.value)
    }, this.props.delay || 1000)
    this.setState({value, timeoutId})
  }

  render() {
    return <FormControl type="text" value={this.state.value} placeholder={this.props.placeholder} onChange={this.handleChange.bind(this)} />
  }
}

DelayInputForm.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  delay: PropTypes.number,
  placeholder: PropTypes.string,
}

const BlodSearchString = ({content, searchString}) => {
  if (!searchString || !content.includes(searchString)) {
    return <div></div>
  }

  const aroundLength = 40
  const index = content.indexOf(searchString)

  let before = content.slice(0, index)
  if (before.length > aroundLength) {
    before = '...' + before.slice(aroundLength)
  }
  let after = content.slice(index + searchString.length)
  if (after.length > aroundLength) {
    after = after.slice(0, aroundLength) + '...'
  }
  return <div>{before}<b>{searchString}</b>{after}</div>
}

BlodSearchString.propTypes = {
  content: PropTypes.string.isRequired,
  searchString: PropTypes.string,
}

export default withRouter(translate(CustomerServiceTickets))
