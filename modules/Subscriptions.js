import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Pager } from 'react-bootstrap'
import qs from 'query-string'
import _ from 'lodash'
import moment from 'moment'
import { auth, db } from '../lib/leancloud'
import { Link } from 'react-router'
import { UserLabel } from './common'
import TicketStatusLabel from './TicketStatusLabel'
import css from './CustomerServiceTickets.css'

export default class Subscriptions extends Component {
  constructor(props) {
    super(props)
    this.state = {
      watches: []
    }
  }

  componentDidMount() {
    if (this.props.location.pathname === '/notifications/subscriptions') {
      this.findWatches(this.props.location.query)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (
      !_.isEqual(nextProps.location, this.props.location) &&
      nextProps.location.pathname === '/notifications/subscriptions'
    ) {
      this.findWatches(nextProps.location.query)
    }
  }

  findWatches(filters) {
    const { page = '0', size = '10' } = filters

    db.class('Watch')
      .where('user', '==', auth.currentUser())
      .orderBy('updatedAt', 'desc')
      .include('ticket')
      .limit(parseInt(size))
      .skip(parseInt(page) * parseInt(size))
      .find()
      .then(watches => {
        this.setState({ watches })
        return watches
      })
      .catch(this.context.addNotification)
  }

  renderCell(watchData) {
    const ticket = watchData.get('ticket')

    return (
      <div
        className={`${css.ticket} ${css.row}`}
        key={ticket.get('nid')}
      >
        <div className={css.ticketContent}>
          <div className={css.heading}>
            <div className={css.left}>
              <Link className={css.title} to={'/tickets/' + ticket.get('nid')}>
                {ticket.get('title')}
              </Link>
            </div>
            <div className={css.right}>
              {ticket.get('replyCount') && (
                <Link
                  className={css.commentCounter}
                  title={'reply ' + ticket.get('replyCount')}
                  to={'/tickets/' + ticket.get('nid')}
                >
                  <span
                    className={
                      css.commentCounterIcon + ' glyphicon glyphicon-comment'
                    }
                  ></span>
                  {ticket.get('replyCount')}
                </Link>
              )}
            </div>
          </div>

          <div className={css.meta}>
            <div className={css.left}>
              <span className={css.nid}>#{ticket.get('nid')}</span>
              <span className={css.status}>
                <TicketStatusLabel status={ticket.get('status')} />
              </span>
              <span className={css.creator}>
                <UserLabel user={ticket.get('author')} />
              </span>
              创建于 {moment(ticket.get('createdAt')).fromNow()}
              {moment(ticket.get('createdAt')).fromNow() !==
                moment(ticket.get('updatedAt')).fromNow() && (
                <span>
                  ，更新于 {moment(ticket.get('updatedAt')).fromNow()}
                </span>
              )}
            </div>
            <div className={css.right}>
              <span className={css.assignee}>
                <UserLabel user={ticket.get('assignee')} />
              </span>
              <span className={css.contributors}>
                {_.uniqBy(
                  ticket.get('joinedCustomerServices') || [],
                  'objectId'
                ).map(user => (
                  <UserLabel key={user.objectId} user={user} />
                ))}
              </span>
            </div>
          </div>
          <span style={{ color: 'gray' }}>
            {(ticket.get('latestReply') && ticket.get('latestReply').content) ||
              '<暂无>'}
          </span>
        </div>
      </div>
    )
  }

  updateFilter(filter) {
    if (!filter.page) {
      filter.page = '0'
    }
    filter.size = '10'
    this.context.router.push(this.getQueryUrl(filter))
  }
  getQueryUrl(filter) {
    const filters = _.assign({}, this.props.location.query, filter)
    return this.props.location.pathname + '?' + qs.stringify(filters)
  }

  renderPager() {
    const filters = this.props.location.query
    const { page = '0', size = '10' } = filters

    let pager
    const isFirstPage = page === '0'
    const isLastPage = parseInt(size) !== this.state.watches.length
    if (!(isFirstPage && isLastPage)) {
      pager = (
        <Pager>
          <Pager.Item
            disabled={isFirstPage}
            previous
            onClick={() => this.updateFilter({ page: parseInt(page) - 1 + '' })}
          >
            &larr; 上一页
          </Pager.Item>
          <Pager.Item
            disabled={isLastPage}
            next
            onClick={() => this.updateFilter({ page: parseInt(page) + 1 + '' })}
          >
            下一页 &rarr;
          </Pager.Item>
        </Pager>
      )
    }

    return pager
  }

  render() {
    return (
      <div>
        {this.state.watches.map(watchItem => this.renderCell(watchItem))}
        {this.renderPager()}
      </div>
    )
  }
}

Subscriptions.propTypes = {
  location: PropTypes.object.isRequired
}

Subscriptions.contextTypes = {
  addNotification: PropTypes.func.isRequired,
  router: PropTypes.object.isRequired
}
