import React from 'react'
import { Button, Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import moment from 'moment'
import _ from 'lodash'

import { cloud, db } from '../lib/leancloud'
import { fetchUsers } from './common'
import { getUserDisplayName } from '../lib/common'
import { getConfig } from './config'
import { UserLabel } from './UserLabel'

const sortAndIndexed = (datas, sortFn) => {
  const sorted = _.sortBy(datas, sortFn)
  _.forEach(sorted, (data, index) => {
    data.index = index + 1
  })
  return sorted
}

class SummaryTable extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isOpen: false,
    }
  }

  open(e) {
    e.preventDefault()
    this.setState({ isOpen: true })
  }

  render() {
    let trs
    const fn = (row) => {
      return (
        <tr key={row[0]}>
          {row.slice(1).map((c, i) => (
            <td key={i}>{c}</td>
          ))}
        </tr>
      )
    }
    if (this.state.isOpen || this.props.body.length <= 6) {
      trs = this.props.body.map(fn)
    } else {
      const foldingLine = (
        <tr key="compress">
          <td colSpan="100">
            <a href="#" onClick={this.open.bind(this)}>
              ……
            </a>
          </td>
        </tr>
      )
      trs = this.props.body
        .slice(0, 3)
        .map(fn)
        .concat(foldingLine, this.props.body.slice(this.props.body.length - 3).map(fn))
    }
    return (
      <Table>
        <thead>
          <tr>
            {this.props.header.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{trs}</tbody>
      </Table>
    )
  }
}

SummaryTable.propTypes = {
  header: PropTypes.array.isRequired,
  body: PropTypes.array.isRequired,
}

class StatsSummary extends React.Component {
  constructor(props) {
    super(props)
    this.state = _.extend({
      startDate: null,
      endDate: null,
      timeUnit: null,
      users: [],
      statsDatas: [],
    })
  }

  getTimeRange(timeUnit) {
    if (timeUnit === 'month') {
      return {
        startDate: moment().startOf('month').subtract(2, 'month'),
        endDate: moment().startOf('month'),
        timeUnit: 'month',
      }
    } else {
      const offsetDays = getConfig('stats.offsetDays', 0)
      return {
        startDate: moment().startOf('week').subtract(1, 'weeks').add(offsetDays, 'days'),
        endDate: moment().startOf('week').add(1, 'weeks').add(offsetDays, 'days'),
        timeUnit: 'weeks',
      }
    }
  }

  fetchTickets(ids) {
    return Promise.all(
      _.chunk(ids, 50).map((ids) =>
        db
          .class('Ticket')
          .select('author', 'assignee', 'category')
          .where('objectId', 'in', ids)
          .find()
      )
    ).then(_.flatten)
  }

  async fetchStatsDatas(startDate, endDate, timeUnit) {
    const [newTicketCounts, statses] = await Promise.all([
      cloud.run('getNewTicketCount', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        timeUnit,
      }),
      cloud.run('getStats', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        timeUnit,
      }),
    ])

    const activeTicketIds = _.uniq(statses.map((stats) => stats.tickets).flat())
    const activeTickets = (await this.fetchTickets(activeTicketIds)).map((o) => o.toJSON())
    const userIdSet = new Set([
      ...statses.map((stats) => stats.firstReplyTimeByUser.map((t) => t.userId)).flat(),
      ...statses.map((stats) => stats.replyTimeByUser.map((t) => t.userId)).flat(),
    ])

    const statsDatas = statses.map((stats, index) => {
      const idSet = new Set(stats.tickets)
      const tickets = activeTickets.filter((ticket) => idSet.has(ticket.objectId))

      const categoryIds = tickets.map((ticket) => ticket.category.objectId)
      const assigneeIds = tickets.map((ticket) => ticket.assignee?.objectId).filter(_.identity)
      const authorIds = tickets.map((ticket) => ticket.author.objectId)
      assigneeIds.forEach((id) => userIdSet.add(id))
      authorIds.forEach((id) => userIdSet.add(id))

      const activeTicketCountsByCategory = sortAndIndexed(
        _.toPairs(_.countBy(categoryIds)),
        ([_k, v]) => -v
      )
      const activeTicketCountByAssignee = sortAndIndexed(
        _.toPairs(_.countBy(assigneeIds)),
        ([_k, v]) => -v
      )
      const activeTicketCountByAuthor = sortAndIndexed(
        _.toPairs(_.countBy(authorIds)),
        ([_k, v]) => -v
      )
      const firstReplyTimeByUser = sortAndIndexed(
        stats.firstReplyTimeByUser,
        (t) => t.replyTime / t.replyCount
      )
      const replyTimeByUser = sortAndIndexed(
        stats.replyTimeByUser,
        (t) => t.replyTime / t.replyCount
      )
      const tagsArray = _.chain(stats.tags)
        .toPairs()
        .groupBy((row) => JSON.parse(row[0]).key)
        .values()
        .map((tags) => sortAndIndexed(tags, ([_k, v]) => -v))
        .value()

      return {
        date: stats.date,
        newTicketCount: newTicketCounts[index].count,
        activeTicketCounts: stats.tickets.length,
        activeTicketCountsByCategory,
        activeTicketCountByAssignee,
        activeTicketCountByAuthor,
        firstReplyTimeByUser,
        replyTimeByUser,
        firstReplyTime: stats.firstReplyTime,
        workdayFirstReplyTime: stats.workdayFirstReplyTime,
        workdayFirstReplyCount: stats.workdayFirstReplyCount,
        firstReplyCount: stats.firstReplyCount,
        replyTime: stats.replyTime,
        replyCount: stats.replyCount,
        tagsArray,
      }
    })

    return {
      statsDatas,
      users: await fetchUsers(Array.from(userIdSet)),
    }
  }

  componentDidMount() {
    this.changeTimeUnit('weeks')
  }

  changeTimeUnit(timeUnit) {
    const { startDate, endDate } = this.getTimeRange(timeUnit)
    return this.fetchStatsDatas(startDate, endDate, timeUnit).then(({ users, statsDatas }) => {
      this.setState({ startDate, endDate, timeUnit, users, statsDatas })
      return
    })
  }

  render() {
    const { t } = this.props
    if (!this.state) {
      return <div>{t('loading')}……</div>
    }

    const dateDoms = this.state.statsDatas.map((data) => {
      if (this.state.timeUnit === 'month') {
        return <span>{moment(data.date).format('YYYY-MM')}</span>
      } else {
        return (
          <span>
            {t('until')} {moment(data.date).add(1, 'weeks').format('YYYY-MM-DD, [W]WW')}
          </span>
        )
      }
    })

    const summaryDoms = this.state.statsDatas.map((data) => {
      return (
        <Table>
          <thead>
            <tr>
              <th>{t('createdTicket')}</th>
              <th>{t('activeTicket')}</th>
              <th>{t('averageFirstReplyTime')}</th>
              <th>{t('averageFirstReplyTimeInTheWorkday')}</th>
              <th>{t('averageReplyTime')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{data.newTicketCount}</td>
              <td>{data.activeTicketCounts}</td>
              <td>
                {(data.firstReplyTime / data.firstReplyCount / 1000 / 60 / 60).toFixed(2)}{' '}
                {t('hour')}
              </td>
              <td>
                {(
                  data.workdayFirstReplyTime /
                  data.workdayFirstReplyCount /
                  1000 /
                  60 /
                  60
                ).toFixed(2)}{' '}
                {t('hour')}
              </td>
              <td>
                {(data.replyTime / data.replyCount / 1000 / 60 / 60).toFixed(2)} {t('hour')}
              </td>
            </tr>
          </tbody>
        </Table>
      )
    })

    const activeTicketCountsByCategoryDoms = this.state.statsDatas.map((d) => {
      const body = d.activeTicketCountsByCategory.map((row) => {
        const category = _.find(this.props.categories, (c) => c.id === row[0])
        return [row[0], row.index, (category && category.get('name')) || row[0], row[1]]
      })
      return <SummaryTable header={[t('rank'), t('category'), t('activeTicket')]} body={body} />
    })

    const activeTicketCountByAssigneeDoms = this.state.statsDatas.map((data) => {
      const body = data.activeTicketCountByAssignee.map((row) => {
        const user = _.find(this.state.users, (c) => c.id === row[0])
        return [row[0], row.index, (user && getUserDisplayName(user)) || row[0], row[1]]
      })
      return (
        <SummaryTable header={[t('rank'), t('customerService'), t('activeTicket')]} body={body} />
      )
    })

    const activeTicketCountByAuthorDoms = this.state.statsDatas.map((data) => {
      const body = data.activeTicketCountByAuthor.map((row) => {
        const user = _.find(this.state.users, (c) => c.id === row[0])
        return [row[0], row.index, <UserLabel user={user.data} displayTags />, row[1]]
      })
      return <SummaryTable header={[t('rank'), t('user'), t('activeTicket')]} body={body} />
    })

    const getLinkTimeRange = (i) => {
      const { startDate, endDate } = this.getTimeRange(this.state.timeUnit)
      let tStart = i === 0 ? moment(startDate) : moment(startDate).add(1, this.state.timeUnit)
      let tEnd = tStart.clone().add(1, this.state.timeUnit)
      if (tEnd > endDate) {
        tEnd = moment(endDate)
      }
      return {
        startTime: tStart.toDate(),
        endTime: tEnd.toDate(),
      }
    }

    const firstReplyTimeByUserDoms = this.state.statsDatas.map((data, i) => {
      const body = data.firstReplyTimeByUser.map(({ userId, replyTime, replyCount, index }) => {
        const { startTime, endTime } = getLinkTimeRange(i)
        const user = _.find(this.state.users, (c) => c.id === userId)
        return [
          userId,
          index,
          <Link
            to={`/customerService/stats/users/${userId}?start=${startTime.toISOString()}&end=${endTime.toISOString()}`}
          >
            {(user && getUserDisplayName(user)) || userId}
          </Link>,
          (replyTime / replyCount / 1000 / 60 / 60).toFixed(2) + ' ' + t('hour'),
          replyCount,
        ]
      })
      return (
        <SummaryTable
          header={[t('rank'), t('customerService'), t('averageReplyTime'), t('replyCount')]}
          body={body}
        />
      )
    })
    const replyTimeByUserDoms = this.state.statsDatas.map((data, i) => {
      const body = data.replyTimeByUser.map(({ userId, replyTime, replyCount, index }) => {
        const { startTime, endTime } = getLinkTimeRange(i)
        const user = _.find(this.state.users, (c) => c.id === userId)
        return [
          userId,
          index,
          <Link
            to={`/customerService/stats/users/${userId}?start=${startTime.toISOString()}&end=${endTime.toISOString()}`}
          >
            {(user && getUserDisplayName(user)) || userId}
          </Link>,
          (replyTime / replyCount / 1000 / 60 / 60).toFixed(2) + ' ' + t('hour'),
          replyCount,
        ]
      })
      return (
        <SummaryTable
          header={[t('rank'), t('customerService'), t('averageReplyTime'), t('replyCount')]}
          body={body}
        />
      )
    })

    const tagDoms = this.state.statsDatas.map((data) => {
      const tables = data.tagsArray.map((tags) => {
        const body = tags.map((row, index) => {
          const { value } = JSON.parse(row[0])
          return [index, row.index, value, row[1]]
        })
        const key = JSON.parse(tags[0][0]).key
        return (
          <SummaryTable
            key={key}
            header={[t('rank'), t('tag') + ':' + key, t('count')]}
            body={body}
          />
        )
      })
      return <div>{tables}</div>
    })

    return (
      <div>
        <h2>
          {t('summary')}{' '}
          <small>
            {this.state.timeUnit === 'month' ? (
              <Button onClick={() => this.changeTimeUnit('weeks')} variant="link">
                {t('toWeekly')}
              </Button>
            ) : (
              <Button onClick={() => this.changeTimeUnit('month')} variant="link">
                {t('toMonthly')}
              </Button>
            )}
          </small>
        </h2>
        <Table>
          <thead>
            <tr>
              <th>{t('time')}</th>
              {dateDoms.map((dom, i) => (
                <td key={i}>{dom}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>{t('overview')}</th>
              {summaryDoms.map((dom, i) => (
                <td key={i}>{dom}</td>
              ))}
            </tr>
            <tr>
              <th>{t('activeTicket') + t('byCategory')}</th>
              {activeTicketCountsByCategoryDoms.map((dom, i) => (
                <td key={i}>{dom}</td>
              ))}
            </tr>
            <tr>
              <th>{t('activeTicket') + t('byStaff')}</th>
              {activeTicketCountByAssigneeDoms.map((dom, i) => (
                <td key={i}>{dom}</td>
              ))}
            </tr>
            <tr>
              <th>{t('activeTicket') + t('byUser')}</th>
              {activeTicketCountByAuthorDoms.map((dom, i) => (
                <td key={i}>{dom}</td>
              ))}
            </tr>
            <tr>
              <th>{t('firstReplyTime')}</th>
              {firstReplyTimeByUserDoms.map((dom, i) => (
                <td key={i}>{dom}</td>
              ))}
            </tr>
            <tr>
              <th>{t('replyTime')}</th>
              {replyTimeByUserDoms.map((dom, i) => (
                <td key={i}>{dom}</td>
              ))}
            </tr>
            <tr>
              <th>{t('tagCount')}</th>
              {tagDoms.map((dom, i) => (
                <td key={i}>{dom}</td>
              ))}
            </tr>
          </tbody>
        </Table>
      </div>
    )
  }
}

StatsSummary.propTypes = {
  categories: PropTypes.array.isRequired,
  t: PropTypes.func,
}

export default withTranslation()(StatsSummary)
