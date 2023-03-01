import React from 'react'
import { Button, Form } from 'react-bootstrap'
import { Line } from 'react-chartjs-2'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import moment from 'moment'
import _ from 'lodash'
import randomColor from 'randomcolor'
import Color from 'color'

import { fetchUsers } from './common'
import { getUserDisplayName } from '../lib/common'
import { getConfig } from './config'
import { cloud } from '../lib/leancloud'

const ticketCountLineChartData = (statses, t) => {
  return _.reduce(
    statses,
    (result, stats) => {
      result.labels.push(moment(stats.date).format('MM-DD'))
      result.datasets[0].data.push(stats.tickets.length)
      return result
    },
    {
      labels: [],
      datasets: [
        {
          label: t('activeTicket'),
          fill: true,
          borderColor: 'rgba(53, 215, 142, 1)',
          backgroundColor: 'rgba(53, 215, 142, .1)',
          data: [],
        },
      ],
    }
  )
}

const replyCountLineChartData = (statses, t) => {
  return _.reduce(
    statses,
    (result, stats) => {
      result.labels.push(moment(stats.date).format('MM-DD'))
      result.datasets[0].data.push(stats.replyCount)
      return result
    },
    {
      labels: [],
      datasets: [
        {
          label: t('activeReply'),
          fill: true,
          borderColor: 'rgba(70, 117, 235, 1)',
          backgroundColor: 'rgba(70, 117, 235, .1)',
          data: [],
        },
      ],
    }
  )
}

const getColorById = (id) => {
  if (id === 'undefined') {
    return randomColor()
  }
  return '#' + id.slice(id.length - 6, id.length)
}

const categoryCountLineChartData = (statses, categories) => {
  let index = 0
  return _.reduce(
    statses,
    (result, stats) => {
      result.labels.push(moment(stats.date).format('MM-DD'))
      _.map(stats.categories, (value, key) => {
        let lineData = _.find(result.datasets, { id: key })
        let color = getColorById(key)
        if (!lineData) {
          const category = _.find(categories, (c) => c.id === key)
          lineData = {
            id: key,
            label: (category && category.get('name')) || key,
            fill: true,
            borderColor: color,
            backgroundColor: Color(color).fade(0.9),
            data: [],
          }
          result.datasets.push(lineData)
        }
        lineData.data[index] = value
      })
      index++
      return result
    },
    {
      labels: [],
      datasets: [],
    }
  )
}

const assigneeCountLineChartData = (statses, users) => {
  let index = 0
  return _.reduce(
    statses,
    (result, stats) => {
      result.labels.push(moment(stats.date).format('MM-DD'))
      _.map(stats.assignees, (value, key) => {
        let lineData = _.find(result.datasets, { id: key })
        let color = getColorById(key)
        if (!lineData) {
          const user = _.find(users, (u) => u.id === key)
          lineData = {
            id: key,
            label: (user && getUserDisplayName(user)) || key,
            fill: true,
            borderColor: color,
            backgroundColor: Color(color).fade(0.9),
            data: [],
          }
          result.datasets.push(lineData)
        }
        lineData.data[index] = value
      })
      index++
      return result
    },
    {
      labels: [],
      datasets: [],
    }
  )
}

const firstReplyTimeLineChartData = (statses, users) => {
  let index = 0
  return _.reduce(
    statses,
    (result, stats) => {
      result.labels.push(moment(stats.date).format('MM-DD'))
      _.forEach(stats.firstReplyTimeByUser, ({ userId, replyTime, replyCount }) => {
        let lineData = _.find(result.datasets, { id: userId })
        let color = getColorById(userId)
        if (!lineData) {
          const user = _.find(users, (u) => u.id === userId)
          lineData = {
            id: userId,
            label: (user && getUserDisplayName(user)) || userId,
            fill: true,
            borderColor: color,
            backgroundColor: Color(color).fade(0.9),
            data: [],
          }
          result.datasets.push(lineData)
        }
        lineData.data[index] = replyTime / replyCount / (1000 * 60 * 60)
      })
      index++
      return result
    },
    {
      labels: [],
      datasets: [],
    }
  )
}

const replyTimeLineChartData = (statses, users) => {
  let index = 0
  return _.reduce(
    statses,
    (result, stats) => {
      result.labels.push(moment(stats.date).format('MM-DD'))
      _.forEach(stats.replyTimeByUser, ({ userId, replyCount, replyTime }) => {
        let lineData = _.find(result.datasets, { id: userId })
        let color = getColorById(userId)
        if (!lineData) {
          const user = _.find(users, (u) => u.id === userId)
          lineData = {
            id: userId,
            label: (user && getUserDisplayName(user)) || userId,
            fill: true,
            borderColor: color,
            backgroundColor: Color(color).fade(0.9),
            data: [],
          }
          result.datasets.push(lineData)
        }
        lineData.data[index] = replyTime / replyCount / (1000 * 60 * 60)
      })
      index++
      return result
    },
    {
      labels: [],
      datasets: [],
    }
  )
}

class StatsChart extends React.Component {
  constructor(props) {
    super(props)
    const offsetDays = getConfig('stats.offsetDays', 0)
    this.state = {
      startDate: moment().startOf('week').subtract(1, 'weeks').add(offsetDays, 'days'),
      endDate: moment().startOf('week').add(1, 'weeks').add(offsetDays, 'days'),
    }
  }

  handleChangeStart(startDate) {
    this.setState({ startDate })
  }

  handleChangeEnd(endDate) {
    this.setState({ endDate })
  }

  handleSubmit(t, e) {
    e.preventDefault()
    let timeUnit = 'day'
    if (this.state.endDate.diff(this.state.startDate, 'days') > 31) {
      timeUnit = 'week'
    }
    return cloud
      .run('getStats', {
        start: this.state.startDate.toISOString(),
        end: this.state.endDate.toISOString(),
        timeUnit,
      })
      .then((statses) => {
        const userIds = _.uniq(
          _.flatten(
            _.concat(
              [],
              statses.map((s) => s.assignees),
              statses.map((s) => {
                return _.map(s.firstReplyTimeByUser, (t) => t.userId)
              }),
              statses.map((s) => {
                return _.map(s.replyTimeByUser, (t) => t.userId)
              })
            )
          )
        )
        return fetchUsers(userIds).then((users) => {
          this.setState({
            ticketCountData: ticketCountLineChartData(statses, t),
            replyCountData: replyCountLineChartData(statses, t),
            categoryCountData: categoryCountLineChartData(statses, this.props.categories),
            assigneeCountData: assigneeCountLineChartData(statses, users),
            firstReplyTimeData: firstReplyTimeLineChartData(statses, users),
            replyTimeData: replyTimeLineChartData(statses, users),
          })
          return
        })
      })
  }

  render() {
    const { t } = this.props
    return (
      <div>
        <Form inline onSubmit={this.handleSubmit.bind(this, t)}>
          <Form.Group>
            <Form.Label className="mx-1">startDate</Form.Label>
            {/* <DatePicker
              selected={this.state.startDate}
              selectsStart
              startDate={this.state.startDate}
              endDate={this.state.endDate}
              onChange={this.handleChangeStart.bind(this)}
            /> */}
          </Form.Group>
          <Form.Group>
            <Form.Label className="mx-1">endDate</Form.Label>
            {/* <DatePicker
              selected={this.state.endDate}
              selectsEnd
              startDate={this.state.startDate}
              endDate={this.state.endDate}
              onChange={this.handleChangeEnd.bind(this)}
            /> */}
          </Form.Group>
          <Button className="ml-1" variant="light" type="submit">
            {t('submit')}
          </Button>
        </Form>
        {this.state.ticketCountData && (
          <div>
            <Line data={this.state.ticketCountData} height={50} />
            <Line data={this.state.replyCountData} height={50} />
            <h3>{t('activeTicket') + ' ' + t('byCategory')}</h3>
            <Line data={this.state.categoryCountData} height={100} />
            <h3>{t('activeTicket') + ' ' + t('byAssignee')}</h3>
            <Line data={this.state.assigneeCountData} height={100} />
            <h3>{t('firstReplyTime') + ' ' + t('customerService')}</h3>
            <Line data={this.state.firstReplyTimeData} height={100} />
            <h3>{t('averageReplyTime') + ' ' + t('customerService')}</h3>
            <Line data={this.state.replyTimeData} height={100} />
          </div>
        )}
      </div>
    )
  }
}

StatsChart.propTypes = {
  categories: PropTypes.array.isRequired,
  t: PropTypes.func,
}

export default withTranslation()(StatsChart)
