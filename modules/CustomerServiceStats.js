import React from 'react'
import moment from 'moment'
import _ from 'lodash'
import {Line} from 'react-chartjs-2'
import AV from 'leancloud-storage'

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const fetchUsers = (userIds) => {
  return Promise.all(_.map(_.chunk(userIds, 50), (userIds) => {
    return new AV.Query('_User')
    .containedIn('objectId', userIds)
    .find()
  }))
  .then(_.flatten)
}

export default React.createClass({
  getInitialState() {
    return {
    }
  },
  componentDidMount() {
    //const start = moment().startOf('year').toDate()
    //const end = moment().endOf('year').toDate()
    const start = moment('2017-03-01').toDate()
    const end = moment('2017-03-07').toDate()
    Promise.all([
      new AV.Query('Stats')
      .equalTo('type', 'activeTicket')
      .greaterThanOrEqualTo('date', start)
      .lessThan('date', end)
      .limit(1000)
      .find(),
      new AV.Query('Category')
      .limit(1000)
      .find()
    ])
    .then(([datas, categories]) => {
      const userIds = _.chain(datas)
      .map(stats => _.keys(stats.get('data').assignee))
      .flatten()
      .uniq()
      .value()
      fetchUsers(userIds)
      .then((users) => {
        const ticketCountData = _.reduce(datas, (result, data) => {
          result.labels.push(moment(data.get('date')).format('MM-DD'))
          result.datasets[0].data.push(data.get('data').ticketCount)
          return result
        }, {
          labels: [],
          datasets: [{
            label: '活跃工单数',
            fill: false,
            data: []
          }]
        })

        const replyCountData = _.reduce(datas, (result, data) => {
          result.labels.push(moment(data.get('date')).format('MM-DD'))
          result.datasets[0].data.push(data.get('data').replyCount)
          return result
        }, {
          labels: [],
          datasets: [{
            label: '活跃回复数',
            fill: false,
            data: []
          }]
        })

        const categoryCountData = _.reduce(datas, (result, data) => {
          result.labels.push(moment(data.get('date')).format('MM-DD'))
          _.map(data.get('data').category, (value, key) => {
            let categoryData = _.find(result.datasets, {id: key})
            if (!categoryData) {
              const category = _.find(categories, c => c.id === key)
              categoryData = {
                id: key,
                label: category.get('name'),
                fill: false,
                borderColor: `rgba(${getRandomInt(0, 255)}, ${getRandomInt(0, 255)}, ${getRandomInt(0, 255)},1)`,
                data: []
              }
              result.datasets.push(categoryData)
            }
            categoryData.data.push(value)
          })
          return result
        }, {
          labels: [],
          datasets: []
        })

        const assigneeCountData = _.reduce(datas, (result, stats) => {
          result.labels.push(moment(stats.get('date')).format('MM-DD'))
          _.map(stats.get('data').assignee, (value, key) => {
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
            lineData.data.push(value)
          })
          return result
        }, {
          labels: [],
          datasets: []
        })

        this.setState({categories, ticketCountData, replyCountData, categoryCountData, assigneeCountData})
      })
    })
  },
  render() {
    return (
      <div>
        <Line data={this.state.ticketCountData} height={50} />
        <Line data={this.state.replyCountData} height={50} />
        <Line data={this.state.categoryCountData} height={100} />
        <Line data={this.state.assigneeCountData} height={100} />
      </div>
    )
  }
})
