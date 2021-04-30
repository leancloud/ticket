import React, { Component } from 'react'
import { Button } from 'react-bootstrap'
import { Link, withRouter } from 'react-router-dom'
import PropTypes from 'prop-types'
import qs from 'query-string'
import _ from 'lodash'
import moment from 'moment'
import * as Icon from 'react-bootstrap-icons'
import { auth, db } from '../lib/leancloud'
import { UserLabel } from './UserLabel'
import { TicketStatusLabel } from './components/TicketStatusLabel'
import css from './CustomerServiceTickets.css'

class Subscriptions extends Component {
  constructor(props) {
    super(props)
    this.state = {
      watches: [],
    }
  }

  componentDidMount() {
    this.findWatches()
  }

  componentDidUpdate(prevProps) {
    if (prevProps.location.search !== this.props.location.search) {
      this.findWatches()
    }
  }

  findWatches() {
    const { page = '0', size = '10' } = qs.parse(this.props.location.search)

    db.class('Watch')
      .where('user', '==', auth.currentUser)
      .orderBy('updatedAt', 'desc')
      .include('ticket', 'ticket.author', 'ticket.assignee')
      .limit(parseInt(size))
      .skip(parseInt(page) * parseInt(size))
      .find()
      .then((watches) => {
        this.setState({ watches })
        return watches
      })
      .catch(this.context.addNotification)
  }

  renderCell(watchData) {
    const ticket = watchData.data.ticket
    const contributors = _.uniqBy(ticket.data.joinedCustomerServices || [], 'objectId')

    return (
      <div className={`${css.ticket} ${css.row}`} key={ticket.get('nid')}>
        <div className={css.ticketContent}>
          <div className={css.heading}>
            <div className={css.left}>
              <Link className={css.title} to={'/tickets/' + ticket.get('nid')}>
                {ticket.get('title')}
              </Link>
            </div>
            <div>
              {ticket.get('replyCount') && (
                <Link
                  className={css.commentCounter}
                  title={'reply ' + ticket.get('replyCount')}
                  to={'/tickets/' + ticket.get('nid')}
                >
                  <Icon.ChatLeft className={css.commentCounterIcon} />
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
                <UserLabel user={ticket.data.author.data} />
              </span>
              创建于 {moment(ticket.get('createdAt')).fromNow()}
              {moment(ticket.get('createdAt')).fromNow() !==
                moment(ticket.get('updatedAt')).fromNow() && (
                <span>，更新于 {moment(ticket.get('updatedAt')).fromNow()}</span>
              )}
            </div>
            <div>
              <span className={css.assignee}>
                <UserLabel user={ticket.data.assignee.data} />
              </span>
              <span className={css.contributors}>
                {contributors.map((user) => (
                  <span key={user.objectId}>
                    <UserLabel user={user} />
                  </span>
                ))}
              </span>
            </div>
          </div>
          <span style={{ color: 'gray' }}>
            {(ticket.get('latestReply') && ticket.get('latestReply').content) || '<暂无>'}
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
    this.props.history.push(this.getQueryUrl(filter))
  }

  getQueryUrl(filter) {
    const filters = _.assign({}, qs.parse(this.props.location.search), filter)
    return this.props.location.pathname + '?' + qs.stringify(filters)
  }

  renderPager() {
    const { page = '0', size = '10' } = qs.parse(this.props.location.search)

    let pager
    const isFirstPage = page === '0'
    const isLastPage = parseInt(size) !== this.state.watches.length
    if (!(isFirstPage && isLastPage)) {
      pager = (
        <div className="my-2 d-flex justify-content-between">
          <Button
            variant="light"
            disabled={isFirstPage}
            onClick={() => this.updateFilter({ page: parseInt(page) - 1 + '' })}
          >
            &larr; 上一页
          </Button>
          <Button
            variant="light"
            disabled={isLastPage}
            onClick={() => this.updateFilter({ page: parseInt(page) + 1 + '' })}
          >
            下一页 &rarr;
          </Button>
        </div>
      )
    }

    return pager
  }

  render() {
    return (
      <div>
        {this.state.watches.map((watchItem) => this.renderCell(watchItem))}
        {this.renderPager()}
      </div>
    )
  }
}

Subscriptions.propTypes = {
  location: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired,
}

Subscriptions.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default withRouter(Subscriptions)
