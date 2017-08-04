import React from 'react'
import PropTypes from 'prop-types'
import moment from 'moment'
import _ from 'lodash'
import {Table, Form, FormGroup, ControlLabel, Button} from 'react-bootstrap'
import {Line} from 'react-chartjs-2'
import DatePicker from 'react-datepicker'
import AV from 'leancloud-storage/live-query'
import randomColor from 'randomcolor'
import Color from 'color'
import DocumentTitle from 'react-document-title'

// 默认情况，周统计按照周日 23 点 59 分 59 秒作为统计周期分割
// 可以通过修改统计偏移日期调整周期分割
// 比如 -3 为周四 23 点 59 分 59 秒
const offsetDays = -3

const fetchUsers = (userIds) => {
  return Promise.all(_.map(_.chunk(userIds, 50), (userIds) => {
    return new AV.Query('_User')
    .containedIn('objectId', userIds)
    .find()
  }))
  .then(_.flatten)
}

const ticketCountLineChartData = (statses) => {
  return _.reduce(statses, (result, stats) => {
    result.labels.push(moment(stats.date).format('MM-DD'))
    result.datasets[0].data.push(stats.tickets.length)
    return result
  }, {
    labels: [],
    datasets: [{
      label: '活跃工单数',
      fill: true,
      borderColor: 'rgba(53, 215, 142, 1)',
      backgroundColor: 'rgba(53, 215, 142, .1)',
      data: [],
    }]
  })
}

const replyCountLineChartData = (statses) => {
  return _.reduce(statses, (result, stats) => {
    result.labels.push(moment(stats.date).format('MM-DD'))
    result.datasets[0].data.push(stats.replyCount)
    return result
  }, {
    labels: [],
    datasets: [{
      label: '活跃回复数',
      fill: true,
      borderColor: 'rgba(70, 117, 235, 1)',
      backgroundColor: 'rgba(70, 117, 235, .1)',
      data: []
    }]
  })
}

const categoryCountLineChartData = (statses, categories) => {
  let index = 0
  return _.reduce(statses, (result, stats) => {
    result.labels.push(moment(stats.date).format('MM-DD'))
    _.map(stats.categories, (value, key) => {
      let lineData = _.find(result.datasets, {id: key})
      let color = getColorById(key)
      if (!lineData) {
        const category = _.find(categories, c => c.id === key)
        lineData = {
          id: key,
          label: category && category.get('name') || key,
          fill: true,
          borderColor: color,
          backgroundColor: Color(color).fade(.9),
          data: []
        }
        result.datasets.push(lineData)
      }
      lineData.data[index] = value
    })
    index++
    return result
  }, {
    labels: [],
    datasets: []
  })
}

const assigneeCountLineChartData = (statses, users) => {
  let index = 0
  return _.reduce(statses, (result, stats) => {
    result.labels.push(moment(stats.date).format('MM-DD'))
    _.map(stats.assignees, (value, key) => {
      let lineData =  _.find(result.datasets, {id: key})
      let color = getColorById(key)
      if (!lineData) {
        const user = _.find(users, u => u.id === key)
        lineData = {
          id: key,
          label: user && user.get('username') || key,
          fill: true,
          borderColor: color,
          backgroundColor: Color(color).fade(.9),
          data: []
        }
        result.datasets.push(lineData)
      }
      lineData.data[index] = value
    })
    index++
    return result
  }, {
    labels: [],
    datasets: []
  })
}

const firstReplyTimeLineChartData = (statses, users) => {
  let index = 0
  return _.reduce(statses, (result, stats) => {
    result.labels.push(moment(stats.date).format('MM-DD'))
    _.forEach(stats.firstReplyTimeByUser, ({userId, replyTime, replyCount}) => {
      let lineData =  _.find(result.datasets, {id: userId})
      let color = getColorById(userId)
      if (!lineData) {
        const user = _.find(users, u => u.id === userId)
        lineData = {
          id: userId,
          label: user && user.get('username') || userId,
          fill: true,
          borderColor: color,
          backgroundColor: Color(color).fade(.9),
          data: []
        }
        result.datasets.push(lineData)
      }
      lineData.data[index] = replyTime / replyCount / (1000 * 60 * 60)
    })
    index++
    return result
  }, {
    labels: [],
    datasets: []
  })
}

const replyTimeLineChartData = (statses, users) => {
  let index = 0
  return _.reduce(statses, (result, stats) => {
    result.labels.push(moment(stats.date).format('MM-DD'))
    _.forEach(stats.replyTimeByUser, ({userId, replyCount, replyTime}) => {
      let lineData =  _.find(result.datasets, {id: userId})
      let color = getColorById(userId)
      if (!lineData) {
        const user = _.find(users, u => u.id === userId)
        lineData = {
          id: userId,
          label: user && user.get('username') || userId,
          fill: true,
          borderColor: color,
          backgroundColor: Color(color).fade(.9),
          data: []
        }
        result.datasets.push(lineData)
      }
      lineData.data[index] = replyTime / replyCount / (1000 * 60 * 60)
    })
    index++
    return result
  }, {
    labels: [],
    datasets: []
  })
}

const getColorById = (id) => {
  if (id === 'undefined') {
    return randomColor()
  }
  return '#' + id.slice(id.length - 6, id.length)
}

export default class CustomerServiceStats extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      categories: []
    }
  }

  componentDidMount() {
    return new AV.Query('Category')
    .limit(1000)
    .find()
    .then((categories) => {
      this.setState({categories})
    })
    .catch(this.context.addNotification)
  }

  render() {
    return (
      <div>
        <DocumentTitle title='统计 - LeanTicket' />
        <StatsSummary categories={this.state.categories} />
        <StatsChart categories={this.state.categories} />
      </div>
    )
  }

}

CustomerServiceStats.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

class StatsChart extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      startDate: moment().startOf('week').subtract(1, 'weeks').add(offsetDays, 'days'),
      endDate: moment().startOf('week').add(1, 'weeks').add(offsetDays, 'days'),
    }
  }

  handleChangeStart(startDate) {
    this.setState({startDate})
  }

  handleChangeEnd(endDate) {
    this.setState({endDate})
  }

  handleSubmit(e) {
    e.preventDefault()
    let timeUnit = 'day'
    if (this.state.endDate.diff(this.state.startDate, 'days') > 31) {
      timeUnit = 'week'
    }
    return AV.Cloud.run('getStats', {start: this.state.startDate.toISOString(), end: this.state.endDate.toISOString(), timeUnit})
    .then((statses) => {
      const userIds = _.uniq(_.flatten(_.concat([],
        statses.map(s => s.assignees),
        statses.map((s) => {
          return _.map(s.firstReplyTimeByUser, (t => t.userId))
        }),
        statses.map((s) => {
          return _.map(s.replyTimeByUser, (t => t.userId))
        })
      )))
      fetchUsers(userIds).then((users) => {
        this.setState({
          ticketCountData: ticketCountLineChartData(statses),
          replyCountData: replyCountLineChartData(statses),
          categoryCountData: categoryCountLineChartData(statses, this.props.categories),
          assigneeCountData: assigneeCountLineChartData(statses, users),
          firstReplyTimeData: firstReplyTimeLineChartData(statses, users),
          replyTimeData: replyTimeLineChartData(statses, users),
        })
      })
    })
  }

  render() {
    return (
      <div>
        <Form inline onSubmit={this.handleSubmit.bind(this)}>
          <FormGroup>
            <ControlLabel>startDate</ControlLabel>
            {' '}
            <DatePicker
                selected={this.state.startDate}
                selectsStart
                startDate={this.state.startDate}
                endDate={this.state.endDate}
                onChange={this.handleChangeStart.bind(this)}
            />
          </FormGroup>
          {' '}
          <FormGroup>
            <ControlLabel>endDate</ControlLabel>
            {' '}
            <DatePicker
                selected={this.state.endDate}
                selectsEnd
                startDate={this.state.startDate}
                endDate={this.state.endDate}
                onChange={this.handleChangeEnd.bind(this)}
            />
          </FormGroup>
          {' '}
          <Button type='submit'>查询</Button>
        </Form>
        {this.state.ticketCountData &&
          <div>
            <Line data={this.state.ticketCountData} height={50} />
            <Line data={this.state.replyCountData} height={50} />
            <h3>活跃工单数——分类</h3>
            <Line data={this.state.categoryCountData} height={100} />
            <h3>活跃工单数——负责人</h3>
            <Line data={this.state.assigneeCountData} height={100} />
            <h3>工单回复速度——首次回复——技术支持</h3>
            <Line data={this.state.firstReplyTimeData} height={100} />
            <h3>工单回复速度——平均回复——技术支持</h3>
            <Line data={this.state.replyTimeData} height={100} />
          </div>
        }
      </div>
    )
  }

}

StatsChart.propTypes = {
  categories: PropTypes.array.isRequired,
}

const sortAndIndexed = (datas, sortFn) => {
  const sorted = _.sortBy(datas, sortFn)
  _.forEach(sorted, (data, index) => {
    data.index = index + 1
  })
  return sorted
}

class StatsSummary extends React.Component {

  componentDidMount() {
    const startDate = moment().startOf('week').subtract(1, 'weeks').add(offsetDays, 'days')
    const endDate = moment().startOf('week').add(1, 'weeks').add(offsetDays, 'days')
    Promise.all([
      AV.Cloud.run('getNewTicketCount', {start: startDate.toISOString(), end: endDate.toISOString(), timeUnit: 'week'}),
      AV.Cloud.run('getStats', {start: startDate.toISOString(), end: endDate.toISOString(), timeUnit: 'week'}),
    ])
    .then(([newTicketCounts, statses]) => {
      const statsDatas = statses.map((stats, index) => {
        const activeTicketCountsByCategory = sortAndIndexed(_.toPairs(stats.categories), ([_k, v]) => -v)
        const activeTicketCountByAssignee = sortAndIndexed(_.toPairs(stats.assignees), ([_k, v]) => -v)
        const activeTicketCountByAuthor = sortAndIndexed(_.toPairs(stats.authors), ([_k, v]) => -v)
        const firstReplyTimeByUser = sortAndIndexed(stats.firstReplyTimeByUser, t => t.replyTime / t.replyCount)
        const replyTimeByUser = sortAndIndexed(stats.replyTimeByUser, t => t.replyTime / t.replyCount)
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
          userIds
        }
      })

      fetchUsers(_.uniq(_.flatten(statsDatas.map(data => data.userIds)))).then((users) => {
        this.setState({
          users,
          statsDatas,
        })
      })
    })
  }

  render() {
    if (!this.state) {
      return <div>数据读取中……</div>
    }

    const dateDoms = this.state.statsDatas.map(data => {
      return <span>截止到 {moment(data.date).add(1, 'weeks').format('YYYY [年] MM [月] DD [日][（第] ww [周）]')}</span>
    })

    const summaryDoms = this.state.statsDatas.map(data => {
      return <Table>
        <thead>
          <tr>
            <th>新增工单</th>
            <th>活跃工单</th>
            <th>平均首次响应</th>
            <th>平均响应</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{data.newTicketCount}</td>
            <td>{data.activeTicketCounts}</td>
            <td>{(data.firstReplyTime / data.firstReplyCount / 1000 / 60 / 60).toFixed(2)} 小时</td>
            <td>{(data.replyTime / data.replyCount / 1000 / 60 / 60).toFixed(2)} 小时</td>
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
        header={['排名', '分类', '活跃工单']}
        body={body}
      />
    })

    const activeTicketCountByAssigneeDoms = this.state.statsDatas.map(data => {
      const body = data.activeTicketCountByAssignee.map(row => {
        const user = _.find(this.state.users, c => c.id === row[0])
        return [
          row[0],
          row.index,
          user && user.get('username') || row[0],
          row[1],
        ]
      })
      return <SummaryTable
        header={['排名', '客服', '活跃工单数']}
        body={body}
      />
    })

    const activeTicketCountByAuthorDoms = this.state.statsDatas.map(data => {
      const body = data.activeTicketCountByAuthor.map(row => {
        const user = _.find(this.state.users, c => c.id === row[0])
        return [
          row[0],
          row.index,
          user && user.get('username') || row[0],
          row[1],
        ]
      })
      return <SummaryTable
        header={['排名', '用户', '活跃工单数']}
        body={body}
      />
    })

    const firstReplyTimeByUserDoms = this.state.statsDatas.map(data => {
      const body = data.firstReplyTimeByUser.map(({userId, replyTime, replyCount, index}) => {
        const user = _.find(this.state.users, c => c.id === userId)
        return [
          userId,
          index,
          user && user.get('username') || userId,
          (replyTime / replyCount / 1000 / 60 / 60).toFixed(2) + ' 小时',
          replyCount,
        ]
      })
      return <SummaryTable
        header={['排名', '客服', '平均耗时', '回复次数 ']}
        body={body}
      />
    })

    const replyTimeByUserDoms = this.state.statsDatas.map(data => {
      const body = data.replyTimeByUser.map(({userId, replyTime, replyCount, index}) => {
        const user = _.find(this.state.users, c => c.id === userId)
        return [
          userId,
          index,
          user && user.get('username') || userId,
          (replyTime / replyCount / 1000 / 60 / 60).toFixed(2) + ' 小时',
          replyCount,
        ]
      })
      return <SummaryTable
        header={['排名', '客服', '平均耗时', '回复次数 ']}
        body={body}
      />
    })

    return <div>
      <h2>概要</h2>
      <Table>
        <thead>
          <tr>
            <th>时间</th>
            {dateDoms.map(dom => <td>{dom}</td>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>总览</th>
            {summaryDoms.map(dom => <td>{dom}</td>)}
          </tr>
          <tr>
            <th>活跃工单数（分类）</th>
            {activeTicketCountsByCategoryDoms.map(dom => <td>{dom}</td>)}
          </tr>
          <tr>
            <th>活跃工单数（客服）</th>
            {activeTicketCountByAssigneeDoms.map(dom => <td>{dom}</td>)}
          </tr>
          <tr>
            <th>活跃工单数（用户）</th>
            {activeTicketCountByAuthorDoms.map(dom => <td>{dom}</td>)}
          </tr>
          <tr>
            <th>首次回复耗时</th>
            {firstReplyTimeByUserDoms.map(dom => <td>{dom}</td>)}
          </tr>
          <tr>
            <th rowSpan='7'>回复耗时</th>
            {replyTimeByUserDoms.map(dom => <td>{dom}</td>)}
          </tr>
        </tbody>
      </Table>
    </div>
  }

}

StatsSummary.propTypes = {
  categories: PropTypes.array.isRequired,
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
      const foldingLine = <tr>
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
