import React from 'react'
import PropTypes from 'prop-types'
import {Table} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'
import DocumentTitle from 'react-document-title'

export default class CSStatsUser extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      statses: []
    }
  }

  componentDidMount() {
    const {start, end}= this.props.location.query
    return AV.Cloud.run('getStatsTicketByUser', {
      userId: this.props.params.userId,
      start,
      end,
    })
    .then((statses) => {
      return AV.Object.fetchAll(statses.map(s => new AV.Object.createWithoutData('Ticket', s.ticket.objectId) ))
      .then(() => this.setState({statses}))
      .catch(e=>console.log(e))
    })
    .catch(this.context.addNotification)
  }

  render() {
    const userId = this.props.params.userId
    let trs = []
    try {
      trs = this.state.statses.map(stats => {
        console.log(stats)
        let firstReplyStatsTd = <td>没有参与</td>
        if (stats.firstReplyStats.userId === userId) {
          firstReplyStatsTd = <td>{(stats.firstReplyStats.firstReplyTime / 1000 / 60 / 60).toFixed(2)} 小时</td>
        }
        const replyTime = stats.replyTimeStats.find(s => s.userId === userId)
        let replyTimeTd = <td>没有参与</td>
        if (replyTime) {
          replyTimeTd = <td>{(replyTime.replyTime / replyTime.replyCount / 1000 / 60 / 60).toFixed(2)} 小时</td>
        }
        return <tr>
          <td><a href={`/tickets/${stats.ticket['nid']}`} target='_blank'>{stats.ticket['nid']}</a></td>
          {firstReplyStatsTd}
          {replyTimeTd}
          <td>{replyTime && replyTime.replyCount}</td>
        </tr>
      })
    } catch (error) {
      console.log(error)
    }
    return <div>
      <DocumentTitle title='统计 - LeanTicket' />
      <Table>
        <thead>
          <td>工单 ID</td>
          <td>首次回复时间</td>
          <td>平均回复时间</td>
          <td>回复次数</td>
        </thead>
        <tbody>
          {trs}
        </tbody>
      </Table>
    </div>
  }
  
}

CSStatsUser.propTypes = {
  params: PropTypes.object,
  location: PropTypes.object,
}
