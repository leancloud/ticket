import React, {Component} from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Link } from 'react-router'
import { Form, FormGroup, ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem, Checkbox, FormControl, Pager} from 'react-bootstrap'
import qs from 'query-string'
import moment from 'moment'
import AV from 'leancloud-storage/live-query'
import css from './CustomerServiceTickets.css'
import DocumentTitle from 'react-document-title'

import {UserLabel, TicketStatusLabel, getCustomerServices, getCategoriesTree, depthFirstSearchMap, depthFirstSearchFind, getNodeIndentString, getNodePath, getTinyCategoryInfo, getCategoryName} from './common'
import {TICKET_STATUS, TICKET_STATUS_MSG, ticketOpenedStatuses, ticketClosedStatuses, getUserDisplayName} from '../lib/common'
import translate from './i18n/translate'

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
    const authorId = this.props.location.query.authorId
    Promise.all([
      getCustomerServices(),
      getCategoriesTree(false),
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

    const {assigneeId, isOpen, status, categoryId, authorId,
      tagKey, tagValue, isOnlyUnlike, searchString, page = '0', size = '10'} = filters
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

    if (tagKey) {
      const tagMetadata = _.find(this.context.tagMetadatas, m => m.get('key') == tagKey)
      if (tagMetadata) {
        const columnName = tagMetadata.get('isPrivate') ? 'privateTags' : 'tags'
        if (tagValue) {
          query.equalTo(columnName, {key: tagKey, value: tagValue})
        } else {
          query.equalTo(columnName + '.key', tagKey)
        }
      }
    }

    if (JSON.parse(isOnlyUnlike || false)) {
      query.equalTo('evaluation.star', 0)
    }

    return Promise.resolve()
    .then(() => {
      if (searchString && searchString.trim().length > 0) {
        return Promise.all([
          new AV.SearchQuery('Ticket').queryString(`title:*${searchString}* OR content:*${searchString}*`)
            .addDescending('updatedAt')
            .limit(1000)
            .find()
            .then(tickets => {
              return tickets.map(t => t.id)
            }),
          new AV.SearchQuery('Reply').queryString(`content:*${searchString}*`)
            .addDescending('updatedAt')
            .limit(1000)
            .find()
        ])
      }
      return [[], []]
    })
    .then(([searchMatchedTicketIds, searchMatchedReplaies]) => {
      if (searchMatchedTicketIds.length + searchMatchedReplaies.length > 0) {
        const ticketIds = _.union(searchMatchedTicketIds, searchMatchedReplaies.map(r => r.get('ticket').id))
        query.containedIn('objectId', ticketIds)
      }
      return query.include('author')
      .include('assignee')
      .limit(parseInt(size))
      .skip(parseInt(page) * parseInt(size))
      .addDescending('updatedAt')
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
    tickets.forEach(t => t.set('category', category))
    AV.Object.saveAll(tickets)
    .then(() => {
      this.setState({isCheckedAll: false, checkedTickets: new Set()})
      this.updateFilter({})
      return
    })
    .catch(this.context.addNotification)
  }

  render() {
    const {t} = this.props
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
        <div className={`${css.ticket} ${css.row}`} key={ticket.get('nid')}>
          <Checkbox className={css.ticketSelectCheckbox} onClick={this.handleClickCheckbox.bind(this)} value={ticket.id} checked={this.state.checkedTickets.has(ticket.id)}></Checkbox>
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
                <span className={css.creator}><UserLabel user={ticket.get('author')} /></span> {t('createdAt')} {moment(ticket.get('createdAt')).fromNow()}
                {moment(ticket.get('createdAt')).fromNow() === moment(ticket.get('updatedAt')).fromNow() ||
                  <span> {t('updatedAt')} {moment(ticket.get('updatedAt')).fromNow()}</span>
                }
              </div>
              <div className={css.right}>
                <span className={css.assignee}><UserLabel user={ticket.get('assignee')} /></span>
                <span className={css.contributors}>{joinedCustomerServices}</span>
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
      return <MenuItem key={value} eventKey={value}>{TICKET_STATUS_MSG[value]}</MenuItem>
    })
    const assigneeMenuItems = this.state.customerServices.map((user) => {
      return <MenuItem key={user.id} eventKey={user.id}>{getUserDisplayName(user)}</MenuItem>
    })
    const categoryMenuItems = depthFirstSearchMap(this.state.categoriesTree, c => {
      return <MenuItem key={c.id} eventKey={c.id}>{getNodeIndentString(c) + getCategoryName(c, t)}</MenuItem>
    })

    let statusTitle
    if (filters.status) {
      statusTitle = TICKET_STATUS_MSG[filters.status]
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
        assigneeTitle = getUserDisplayName(assignee)
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
                <Button className={'btn btn-default' + (filters.isOpen === 'false' ? ' active' : '')} onClick={() => this.updateFilter({isOpen: false, status: undefined})}>{t('Completed')}</Button>
                <DropdownButton className={(typeof filters.isOpen === 'undefined' ? ' active' : '')} id='statusDropdown' title={statusTitle} onSelect={(eventKey) => this.updateFilter({status: eventKey, isOpen: undefined})}>
                  <MenuItem key='undefined'>{t('all')}</MenuItem>
                  {statusMenuItems}
                </DropdownButton>
              </ButtonGroup>
              <ButtonGroup>
                <Button className={(filters.assigneeId === AV.User.current().id ? ' active' : '')} onClick={() => this.updateFilter({assigneeId: AV.User.current().id})}>{t('assignedToMe')}</Button>
                <DropdownButton className={(typeof filters.assigneeId === 'undefined' || filters.assigneeId && filters.assigneeId !== AV.User.current().id ? ' active' : '')} id='assigneeDropdown' title={assigneeTitle} onSelect={(eventKey) => this.updateFilter({assigneeId: eventKey})}>
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
          <Checkbox className={css.ticketSelectCheckbox} onClick={this.handleClickCheckAll.bind(this)} checked={this.state.isCheckedAll}></Checkbox>
          {this.state.checkedTickets.size && ticketCheckedOperations || ticketAdminFilters}
        </div>

        {ticketTrs}
        {pager}
      </div>
    )
  }

}

CustomerServiceTickets.propTypes = {
  location: PropTypes.object.isRequired,
  t: PropTypes.func
}

CustomerServiceTickets.contextTypes = {
  router: PropTypes.object.isRequired,
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

export default translate(CustomerServiceTickets)