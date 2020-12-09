import React from 'react'
import PropTypes from 'prop-types'
import moment from 'moment'
import _ from 'lodash'
import {Table, Button} from 'react-bootstrap'
import {Link} from 'react-router'
import AV from 'leancloud-storage/live-query'
import {fetchUsers} from './common'
import offsetDays from '../config'
import translate from './i18n/translate'
import {getUserDisplayName} from '../lib/common'
import { UserTagGroup } from './components/UserTag'
import { getUserTags, USER_TAG_NAME } from '../lib/common'

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
      isOpen: false
    }
  }
  
  open(e) {
    e.preventDefault()
    this.setState({isOpen: true})
  }
  
  render() {
    let trs
    const fn = (row) => {
      return <tr key={row[0]}>
          {row.slice(1).map(c => <td>{c}</td>)}
        </tr>
    }
    if (this.state.isOpen || this.props.body.length <= 6) {
      trs = this.props.body.map(fn)
    } else {
      const foldingLine = <tr key='compress'>
          <td colSpan='100'><a href='#' onClick={this.open.bind(this)}>……</a></td>
        </tr>
      trs = this.props.body.slice(0, 3).map(fn)
        .concat(foldingLine,
          this.props.body.slice(this.props.body.length - 3).map(fn)
        )
    }
    return <Table>
        <thead>
          <tr>
            {this.props.header.map(h => <th>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {trs}
        </tbody>
      </Table>
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
      return {
        startDate: moment().startOf('week').subtract(1, 'weeks').add(offsetDays, 'days'),
        endDate: moment().startOf('week').add(1, 'weeks').add(offsetDays, 'days'),
        timeUnit: 'weeks',
      }
    }
  }
  
  fetchStatsDatas(startDate, endDate, timeUnit) {
    return Promise.all([
      AV.Cloud.run('getNewTicketCount', {start: startDate.toISOString(), end: endDate.toISOString(), timeUnit}),
      AV.Cloud.run('getStats', {start: startDate.toISOString(), end: endDate.toISOString(), timeUnit}),
    ])
      .then(([newTicketCounts, statses]) => {
        const statsDatas = statses.map((stats, index) => {
          const activeTicketCountsByCategory = sortAndIndexed(_.toPairs(stats.categories), ([_k, v]) => -v)
          const activeTicketCountByAssignee = sortAndIndexed(_.toPairs(stats.assignees), ([_k, v]) => -v)
          const activeTicketCountByAuthor = sortAndIndexed(_.toPairs(stats.authors), ([_k, v]) => -v)
          const firstReplyTimeByUser = sortAndIndexed(stats.firstReplyTimeByUser, t => t.replyTime / t.replyCount)
          const replyTimeByUser = sortAndIndexed(stats.replyTimeByUser, t => t.replyTime / t.replyCount)
          const tagsArray = _.chain(stats.tags)
            .toPairs()
            .groupBy(row => JSON.parse(row[0]).key)
            .values()
            .map(tags => sortAndIndexed(tags, ([_k, v]) => -v))
            .value()
          const userIds = _.uniq(_.concat([],
            activeTicketCountByAssignee.map(([k, _v]) => k),
            activeTicketCountByAuthor.map(([k, _v]) => k),
            firstReplyTimeByUser.map(t => t.userId),
            replyTimeByUser.map(t => t.userId)
          ))
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
            firstReplyCount: stats.firstReplyCount,
            replyTime: stats.replyTime,
            replyCount: stats.replyCount,
            tagsArray,
            userIds
          }
        })
  
        return fetchUsers(_.uniq(_.flatten(statsDatas.map(data => data.userIds)))).then((users) => {
          return {users, statsDatas}
        })
      })
  }
  
  componentDidMount() {
    this.changeTimeUnit('weeks')
  }
  
  changeTimeUnit(timeUnit) {
    const {startDate, endDate} = (this.getTimeRange(timeUnit))
    return this.fetchStatsDatas(startDate, endDate, timeUnit)
      .then(({users, statsDatas}) => {
        this.setState({startDate, endDate, timeUnit, users, statsDatas})
        return
      })
  }
  
  render() {
    const {t} = this.props
    if (!this.state) {
      return <div>{t('loading')}……</div>
    }
  
    const dateDoms = this.state.statsDatas.map(data => {
      if (this.state.timeUnit === 'month') {
        return <span>{moment(data.date).format('YYYY-MM')}</span>
      } else {
        return <span>{t('until')} {moment(data.date).add(1, 'weeks').format('YYYY-MM-DD, [W]WW')}</span>
      }
    })
  
    const summaryDoms = this.state.statsDatas.map(data => {
      return <Table>
          <thead>
            <tr>
              <th>{t('createdTicket')}</th>
              <th>{t('activeTicket')}</th>
              <th>{t('averageFirstReplyTime')}</th>
              <th>{t('averageReplyTime')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{data.newTicketCount}</td>
              <td>{data.activeTicketCounts}</td>
              <td>{(data.firstReplyTime / data.firstReplyCount / 1000 / 60 / 60).toFixed(2)} {t('hour')}</td>
              <td>{(data.replyTime / data.replyCount / 1000 / 60 / 60).toFixed(2)} {t('hour')}</td>
            </tr>
          </tbody>
        </Table>
    })
  
    const activeTicketCountsByCategoryDoms = this.state.statsDatas.map(d => {
      const body = d.activeTicketCountsByCategory.map(row => {
        const category = _.find(this.props.categories, c => c.id === row[0])
        return [
          row[0],
          row.index,
          category && category.get('name') || row[0],
          row[1],
        ]
      })
      return <SummaryTable
          header={[t('rank'), t('category'), t('activeTicket')]}
          body={body}
        />
    })
  
    const activeTicketCountByAssigneeDoms = this.state.statsDatas.map(data => {
      const body = data.activeTicketCountByAssignee.map(row => {
        const user = _.find(this.state.users, c => c.id === row[0])
        const username = (
          <span>
            {user && getUserDisplayName(user) || row[0]}
            <UserTagGroup tags={getUserTags(user).filter(tag => tag === USER_TAG_NAME.NEW)} />
          </span>
        )
        return [
          row[0],
          row.index,
          username,
          row[1],
        ]
      })
      return <SummaryTable
          header={[t('rank'), t('staff'), t('activeTicket')]}
          body={body}
        />
    })
  
    const activeTicketCountByAuthorDoms = this.state.statsDatas.map(data => {
      const body = data.activeTicketCountByAuthor.map(row => {
        const user = _.find(this.state.users, c => c.id === row[0])
        return [
          row[0],
          row.index,
          user && getUserDisplayName(user) || row[0],
          row[1],
        ]
      })
      return <SummaryTable
          header={[t('rank'), t('user'), t('activeTicket')]}
          body={body}
        />
    })
  
    const getLinkTimeRange = (i) =>{
      const {startDate,endDate} = (this.getTimeRange(this.state.timeUnit))
      let tStart = i === 0 ? moment(startDate) : moment(startDate).add(1, this.state.timeUnit)
      let tEnd = tStart.clone().add(1, this.state.timeUnit)
      if (tEnd > endDate) {
        tEnd = moment(endDate)
      }
      return {
        startTime: tStart.toDate(),
        endTime: tEnd.toDate()
      }
    }
  
    const firstReplyTimeByUserDoms = this.state.statsDatas.map((data,i) => {
      const body = data.firstReplyTimeByUser.map(({userId, replyTime, replyCount, index}) => {
        const {startTime, endTime} = getLinkTimeRange(i)
        const user = _.find(this.state.users, c => c.id === userId)
        return [
          userId,
          index,
          <Link to={`/customerService/stats/users/${userId}?start=${startTime.toISOString()}&end=${endTime.toISOString()}`}>{user && getUserDisplayName(user) || userId}</Link>,
          (replyTime / replyCount / 1000 / 60 / 60).toFixed(2) + ' ' + t('hour'),
          replyCount,
        ]
      })
      return <SummaryTable
          header={[t('rank'), t('staff'), t('averageReplyTime'), t('replyCount')]}
          body={body}
        />
    })
    const replyTimeByUserDoms = this.state.statsDatas.map((data,i) => {
      const body = data.replyTimeByUser.map(({userId, replyTime, replyCount, index}) => {
        const {startTime, endTime} = getLinkTimeRange(i)
        const user = _.find(this.state.users, c => c.id === userId)
        return [
          userId,
          index,
          <Link to={`/customerService/stats/users/${userId}?start=${startTime.toISOString()}&end=${endTime.toISOString()}`}>{user && getUserDisplayName(user) || userId}</Link>,
          (replyTime / replyCount / 1000 / 60 / 60).toFixed(2) + ' ' + t('hour'),
          replyCount,
        ]
      })
      return <SummaryTable
          header={[t('rank'), t('staff'), t('averageReplyTime'), t('replyCount')]}
          body={body}
        />
    })
  
    const tagDoms = this.state.statsDatas.map(data => {
      const tables = data.tagsArray.map(tags => {
        const body = tags.map((row, index) => {
          const {value} = JSON.parse(row[0])
          return [
            index,
            row.index,
            value,
            row[1],
          ]
        })
        return <SummaryTable
            header={[t('rank'), t('tag') + ':' + JSON.parse(tags[0][0]).key, t('count')]}
            body={body}
          />
      })
      return <div>{tables}</div>
    })
  
    return <div>
        <h2>{t('summary')} <small>
          {this.state.timeUnit === 'month' ?
            <Button onClick={() => this.changeTimeUnit('weeks')} bsStyle="link">{t('toWeekly')}</Button>
            :
            <Button onClick={() => this.changeTimeUnit('month')} bsStyle="link">{t('toMonthly')}</Button>
          }
        </small></h2>
        <Table>
          <thead>
            <tr>
              <th>{t('time')}</th>
              {dateDoms.map(dom => <td>{dom}</td>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>{t('overview')}</th>
              {summaryDoms.map(dom => <td>{dom}</td>)}
            </tr>
            <tr>
              <th>{t('activeTicket')+' '+t('byCategory')}</th>
              {activeTicketCountsByCategoryDoms.map(dom => <td>{dom}</td>)}
            </tr>
            <tr>
              <th>{t('activeTicket')+' '+t('byStaff')}</th>
              {activeTicketCountByAssigneeDoms.map(dom => <td>{dom}</td>)}
            </tr>
            <tr>
              <th>{t('activeTicket')+' '+t('byUser')}</th>
              {activeTicketCountByAuthorDoms.map(dom => <td>{dom}</td>)}
            </tr>
            <tr>
              <th>{t('firstReplyTime')}</th>
              {firstReplyTimeByUserDoms.map(dom => <td>{dom}</td>)}
            </tr>
            <tr>
              <th>{t('replyTime')}</th>
              {replyTimeByUserDoms.map(dom => <td>{dom}</td>)}
            </tr>
            <tr>
              <th>{t('tagCount')}</th>
              {tagDoms.map(dom => <td>{dom}</td>)}
            </tr>
          </tbody>
        </Table>
      </div>
  }
  
  }
  
StatsSummary.propTypes = {
  categories: PropTypes.array.isRequired,
  t: PropTypes.func
}

export default translate(StatsSummary)
  