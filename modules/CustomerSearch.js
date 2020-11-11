import React, { Component } from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Link } from 'react-router'
import { Form, ButtonGroup, Checkbox, FormControl, Pager } from 'react-bootstrap'
import qs from 'query-string'
import moment from 'moment'
import AV from 'leancloud-storage/live-query'
import css from './CustomerServiceTickets.css'
import DocumentTitle from 'react-document-title'

import { UserLabel, TicketStatusLabel, getCustomerServices } from './common'
import translate from './i18n/translate'

const SELECT_BTN_TYPE = {
  reply: 'reply',
  title: 'title'
}



class CustomerServiceTickets extends Component {

  constructor(props) {
    super(props)
    this.state = {
      tickets: [],
      customerServices: [],
      checkedTickets: new Set(),
      isCheckedAll: false,
      selectType: this.props.location.query.selectType || SELECT_BTN_TYPE.reply
    }
    this.handleSelectBtn = this.handleSelectBtn.bind(this)
  }

  componentDidMount() {
    const authorId = this.props.location.query.authorId
    Promise.all([
      getCustomerServices(),
      authorId && new AV.Query('_User').get(authorId),
    ])
      .then(([customerServices, author]) => {
        this.setState({ customerServices, authorUsername: author && author.get('username') })
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
        selectType: SELECT_BTN_TYPE.reply,
      })
      return Promise.resolve()
    }

    const { page = '0', size = '10', replyContent = '', selectType } = filters


    let query = null
    if (selectType === SELECT_BTN_TYPE.reply) {

      query = new AV.Query('Reply')
      query.contains('content', replyContent)
      query.include(['ticket'])

    } else {
      query = new AV.Query('Ticket')
      query.contains('title', replyContent)
    }

    this.setState({ replyContent, selectType })

    return AV.Query.or(query)
      .limit(parseInt(size))
      .include(['ticket'])
      .skip(parseInt(page) * parseInt(size))
      .addDescending('updatedAt')
      .find()
      .then(tickets => {
        return this.setState({ tickets })
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


  handleReplyChange(e) {
    const replyContent = e.target.value
    const filters = _.assign({}, this.props.location.query, { replyContent })
    return this.updateFilter(filters)
  }

  handleFiltersCommit(e) {
    e.preventDefault()
  }

  handleClickCheckbox(e) {
    const checkedTickets = this.state.checkedTickets
    if (e.target.checked) {
      checkedTickets.add(e.target.value)
    } else {
      checkedTickets.delete(e.target.value)
    }
    this.setState({ checkedTickets, isCheckedAll: checkedTickets.size == this.state.tickets.length })
  }

  handleClickCheckAll(e) {
    if (e.target.checked) {
      this.setState({ checkedTickets: new Set(this.state.tickets.map(t => t.id)), isCheckedAll: true })
    } else {
      this.setState({ checkedTickets: new Set(), isCheckedAll: false })
    }
  }

  handleSelectBtn(selectType) {
    return () => {
      this.updateFilter({ selectType, status: undefined })
      this.setState({tickets:[]})
    }
  }


  render() {
    const {t} = this.props
    const filters = this.props.location.query
    const { selectType } = this.state
    const replys = this.state.tickets
    const ticketTrs = replys.map((reply, index) => {

      let ticket = null
      if (selectType === SELECT_BTN_TYPE.reply) {
        ticket = reply['_serverData'].ticket
      } else {
        ticket = reply
      }


      const customerServices = _.uniqBy(ticket.get('joinedCustomerServices') || [], 'objectId').map((user) => {
        return (
          <span key={user.objectId}><UserLabel user={user} /> </span>
        )
      })
      const joinedCustomerServices = <span>{customerServices}</span>
      return (
        <div className={`${css.ticket} ${css.row}`} key={`${ticket.get('nid')}-${index}`}>
          <Checkbox className={css.ticketSelectCheckbox} onClick={this.handleClickCheckbox.bind(this)} value={ticket.id} checked={this.state.checkedTickets.has(ticket.id)}></Checkbox>
          <div className={css.ticketContent}>
            <div className={css.heading}>
              <div className={css.left}>
                {selectType === SELECT_BTN_TYPE.reply &&
                  <div>
                    <Link className={css.title} to={'/tickets/' + ticket.get('nid')}>{reply.get('content')}</Link>
                  </div>
                }
                <Link className={css.desc} to={'/tickets/' + ticket.get('nid')}>{ticket.get('title')}</Link>

                <span>{ticket.get('evaluation') && (ticket.get('evaluation').star === 1 && <span className={css.satisfaction + ' ' + css.happy}>{t('satisfied')}</span> || <span className={css.satisfaction + ' ' + css.unhappy}>{t('unsatisfied')}</span>)}</span>
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
                <Link className={css.statusLink} to={this.getQueryUrl({ status: ticket.get('status'), isOpen: undefined })}><span className={css.status}><TicketStatusLabel status={ticket.get('status')} /></span></Link>
                <span className={css.creator}><UserLabel user={ticket.get('author')} /></span> {t('createdAt')} {moment(ticket.get('createdAt')).fromNow()}
                {moment(ticket.get('createdAt')).fromNow() === moment(ticket.get('updatedAt')).fromNow() ||
                  <span>, {t('updatedAt')} {moment(ticket.get('updatedAt')).fromNow()}</span>
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


    const ticketAdminFilters = (
      <Form inline className='form-group' onSubmit={this.handleFiltersCommit.bind(this)}>
        {/* <FormGroup validationState={this.state.replyContentState}>
        </FormGroup> */}
        <FormControl type="text" value={this.state.replyContent} placeholder={filters.selectType} onChange={this.handleReplyChange.bind(this)} />
        <ButtonGroup>


          <button className={'btn btn-default' + (filters.selectType === SELECT_BTN_TYPE.reply ? ' active' : '')} onClick={this.handleSelectBtn(SELECT_BTN_TYPE.reply)}>{SELECT_BTN_TYPE.reply}</button>

          <button className={'btn btn-default' + (filters.selectType === SELECT_BTN_TYPE.title ? ' active' : '')} onClick={this.handleSelectBtn(SELECT_BTN_TYPE.title)}>{SELECT_BTN_TYPE.title}</button>
        </ButtonGroup>
      </Form>
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
          <Pager.Item disabled={isFirstPage} previous onClick={() => this.updateFilter({ page: (parseInt(filters.page) - 1) + '' })}>&larr; {t('previousPage')}</Pager.Item>
          <Pager.Item disabled={isLastPage} next onClick={() => this.updateFilter({ page: (parseInt(filters.page) + 1) + '' })}>{t('nextPage')} &rarr;</Pager.Item>
        </Pager>
      )
    }

    return (
      <div>
        <DocumentTitle title={`${t('customerServiceTickets')} - LeanTicket`} />
        <div className={css.row}>
          {ticketAdminFilters}
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

export default translate(CustomerServiceTickets)