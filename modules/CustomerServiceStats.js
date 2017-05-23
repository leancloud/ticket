import React from 'react'
import moment from 'moment'
import _ from 'lodash'
import {Table, Form, FormGroup, ControlLabel, Button} from 'react-bootstrap'
import {Line} from 'react-chartjs-2'
import DatePicker from 'react-datepicker'
import AV from 'leancloud-storage'

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const fetchUsers = (userIds) => {
  return Promise.all(_.map(_.chunk(userIds, 50), (userIds) => {
    return new AV.Query('_User')
    .containedIn('objectId', userIds)
    .find()
  }))
  .then(_.flatten)
}

const mergeDailyStats = (statses) => {
  const m = (obj, other, property) => {
    return _.mergeWith(obj[property], other[property], (a = 0, b) => a + b)
  }
  return _.reduce(statses, (result, stats) => {
    const weekDate = moment(stats.data.date).startOf('week').format()
    let mergedData = _.find(result, (stats) => {
      return stats.data.date === weekDate
    })
    if (!mergedData) {
      mergedData = {
        data: {
          date: weekDate,
          assignees: {},
          authors: {},
          categories: {},
          joinedCustomerServices: {},
          statuses: {},
          replyCount: 0,
          tickets: [],
        }
      }
      result.push(mergedData)
    }
    const obj = mergedData.data
    const src = stats.data
    obj.assignees = m(obj, src, 'assignees')
    obj.authors = m(obj, src, 'authors')
    obj.categories = m(obj, src, 'categories')
    obj.joinedCustomerServices = m(obj, src, 'joinedCustomerServices')
    obj.statuses = m(obj, src, 'statuses')
    obj.replyCount += src.replyCount
    obj.tickets = _.union(obj.tickets, src.tickets)
    return result
  }, [])
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
      fill: false,
      data: []
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
      fill: false,
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
      if (!lineData) {
        const category = _.find(categories, c => c.id === key)
        lineData = {
          id: key,
          label: category.get('name'),
          fill: false,
          borderColor: `rgba(${getRandomInt(0, 255)}, ${getRandomInt(0, 255)}, ${getRandomInt(0, 255)},1)`,
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
      if (!lineData) {
        const user = _.find(users, u => u.id === key)
        lineData = {
          id: key,
          label: user && user.get('username') || key,
          fill: false,
          borderColor: `rgba(${getRandomInt(0, 255)}, ${getRandomInt(0, 255)}, ${getRandomInt(0, 255)},1)`,
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
      if (!lineData) {
        const user = _.find(users, u => u.id === userId)
        lineData = {
          id: userId,
          label: user && user.get('username') || userId,
          fill: false,
          borderColor: `rgba(${getRandomInt(0, 255)}, ${getRandomInt(0, 255)}, ${getRandomInt(0, 255)},1)`,
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
      if (!lineData) {
        const user = _.find(users, u => u.id === userId)
        lineData = {
          id: userId,
          label: user && user.get('username') || userId,
          fill: false,
          borderColor: `rgba(${getRandomInt(0, 255)}, ${getRandomInt(0, 255)}, ${getRandomInt(0, 255)},1)`,
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

export default React.createClass({
  getInitialState() {
    return {
      categories: []
    }
  },
  componentDidMount() {
    new AV.Query('Category')
    .limit(1000)
    .find()
    .then((categories) => {
      this.setState({categories})
    })
  },
  render() {
    return (
      <div>
        <StatsSummary categories={this.state.categories} />
        <StatsChart categories={this.state.categories} />
      </div>
    )
  }
})

const StatsChart = React.createClass({
  getInitialState() {
    return {
      //startDate: moment().startOf('week').subtract(1, 'weeks'),
      //endDate: moment().endOf('week'),
      startDate: moment('2017-03-7').startOf('week').subtract(1, 'weeks'),
      endDate: moment('2017-03-7').endOf('week'),
    }
  },
  handleChangeStart(startDate) {
    this.setState({startDate})
  },
  handleChangeEnd(endDate) {
    this.setState({endDate})
  },
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
        }),
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
  },
  render() {
    return (
      <div>
        <Form inline onSubmit={this.handleSubmit}>
          <FormGroup>
            <ControlLabel>startDate</ControlLabel>
            {' '}
            <DatePicker
                selected={this.state.startDate}
                selectsStart
                startDate={this.state.startDate}
                endDate={this.state.endDate}
                onChange={this.handleChangeStart}
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
                onChange={this.handleChangeEnd}
            />
          </FormGroup>
          {' '}
          <Button type='submit'>查询</Button>
        </Form>
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
    )
  }
})

const getHeadsAndTails = (datas, sortFn) => {
  const sorted = _.sortBy(datas, sortFn)
  return sorted.slice(0, 3).concat(sorted.slice(sorted.length - 3))
}


const StatsSummary = React.createClass({
  componentDidMount() {
    const startDate = moment('2017-03-7').startOf('week')
    const endDate = moment('2017-03-7').add(1, 'week').endOf('week')
    Promise.all([
      AV.Cloud.run('getNewTicketCount', {start: startDate.toISOString(), end: endDate.toISOString(), timeUnit: 'week'}),
      AV.Cloud.run('getStats', {start: startDate.toISOString(), end: endDate.toISOString(), timeUnit: 'week'}),
    ])
    .then(([newTicketCounts, statses]) => {
      const newTicketCount = newTicketCounts[0]
      const stats = statses[0]

      const activeTicketCountByCategory = getHeadsAndTails(_.toPairs(stats.categories), ([_k, v]) => v)
      const activeTicketCountByAssignee = getHeadsAndTails(_.toPairs(stats.assignees), ([_k, v]) => v)
      const activeTicketCountByAuthor = getHeadsAndTails(_.toPairs(stats.authors), ([_k, v]) => v)
      const firstReplyTimeByUser = getHeadsAndTails(stats.firstReplyTimeByUser, t => t.replyTime / t.replyCount)
      const replyTimeByUser = getHeadsAndTails(stats.replyTimeByUser, t => t.replyTime / t.replyCount)
      
      const userIds = _.uniq(_.concat([],
        activeTicketCountByAssignee.map(([k, _v]) => k),
        activeTicketCountByAuthor.map(([k, _v]) => k),
        firstReplyTimeByUser.map(t => t.userId),
        replyTimeByUser.map(t => t.userId)
      ))
      fetchUsers(userIds).then((users) => {
        this.setState({
          users,
          newTicketCount,
          activeTicketCount: stats.tickets.length,
          activeTicketCountByCategory,
          activeTicketCountByAssignee,
          activeTicketCountByAuthor,
          firstReplyTimeByUser,
          replyTimeByUser,
        })
      })
    })
  },
  render() {
    if (!this.state) {
      return <div>数据读取中……</div>
    }
    const activeTicketCountByCategory = this.state.activeTicketCountByCategory
    .map(([k, v]) => {
      const category = _.find(this.props.categories, c => c.id === k)
      return <tr>
        <td>{category && category.get('name') || 'data err'}</td>
        <td>{v}</td>
      </tr>
    })
    const activeTicketCountByAssignee = this.state.activeTicketCountByAssignee
    .map(([k, v]) => {
      const user = _.find(this.state.users, c => c.id === k)
      return <tr>
        <td>{user && user.get('username') || 'data err'}</td>
        <td>{v}</td>
      </tr>
    })
    const activeTicketCountByAuthor = this.state.activeTicketCountByAuthor
    .map(([k, v]) => {
      const user = _.find(this.state.users, c => c.id === k)
      return <tr>
        <td>{user && user.get('username') || 'data err'}</td>
        <td>{v}</td>
      </tr>
    })
    const firstReplyTimeByUser = this.state.firstReplyTimeByUser
    .map(({userId, replyTime, replyCount}) => {
      const user = _.find(this.state.users, u => u.id === userId)
      return <tr>
        <td>{user && user.get('username') || 'data err'}</td>
        <td>{(replyTime / replyCount / 1000 / 60 / 60).toFixed(2)}</td>
        <td>{replyCount}</td>
      </tr>
    })

    const replyTimeByUser = this.state.replyTimeByUser
    .map(({userId, replyTime, replyCount}) => {
      const user = _.find(this.state.users, u => u.id === userId)
      return <tr>
        <td>{user && user.get('username') || 'data err'}</td>
        <td>{(replyTime / replyCount / 1000 / 60 / 60).toFixed(2)}</td>
        <td>{replyCount}</td>
      </tr>
    })
    return <div>
      <h2>该要</h2>
      <Table>
        <thead>
          <tr>
            <th></th>
            <th>{moment(this.state.newTicketCount.date).format('gggg-[W]ww')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>新增工单数</th>
            <td>{this.state.newTicketCount.count}</td>
          </tr>
          <tr>
            <th>活跃工单数</th>
            <td>{this.state.activeTicketCount}</td>
          </tr>
          <tr>
            <th rowSpan='7'>活跃工单数（分类）</th>
            <th>分类</th>
            <th>活跃工单数</th>
          </tr>
          {activeTicketCountByCategory}
          <tr>
            <th rowSpan='7'>活跃工单数（客服）</th>
            <th>客服</th>
            <th>活跃工单数</th>
          </tr>
          {activeTicketCountByAssignee}
          <tr>
            <th rowSpan='7'>活跃工单数（用户）</th>
            <th>用户</th>
            <th>活跃工单数</th>
          </tr>
          {activeTicketCountByAuthor}
          <tr>
            <th rowSpan='7'>首次回复耗时</th>
            <th>工程师</th>
            <th>平均耗时</th>
            <th>回复次数</th>
          </tr>
          {firstReplyTimeByUser}
          <tr>
            <th rowSpan='7'>回复耗时</th>
            <th>工程师</th>
            <th>平均耗时</th>
            <th>回复次数</th>
          </tr>
          {replyTimeByUser}
        </tbody>
      </Table>
    </div>
  }
})
