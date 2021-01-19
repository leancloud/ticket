import React from 'react'
import PropTypes from 'prop-types'
import {Table} from 'react-bootstrap'
import { cloud } from '../../lib/leancloud'
import DocumentTitle from 'react-document-title'
import translate from '../i18n/translate'

class CSStatsUser extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      statses: []
    }
  }

  componentDidMount() {
    const {start, end}= this.props.location.query
    return cloud.run('getStatsTicketByUser', {
      userId: this.props.params.userId,
      start,
      end,
    })
    .then((statses) => this.setState({statses}))
    .catch(this.context.addNotification)
  }

  render() {
    const {t} = this.props
    const userId = this.props.params.userId
    let trs = []
    try {
      trs = this.state.statses.map(stats => {
        let firstReplyStatsTd = <td>{t('notInvolved')}</td>
        if (stats.firstReplyStats.userId === userId) {
          firstReplyStatsTd = <td>{(stats.firstReplyStats.firstReplyTime / 1000 / 60 / 60).toFixed(2)} {t('hour')}</td>
        }
        const replyTime = stats.replyTimeStats.find(s => s.userId === userId)
        let replyTimeTd = <td>{t('notInvolved')}</td>
        if (replyTime) {
          replyTimeTd = <td>{(replyTime.replyTime / replyTime.replyCount / 1000 / 60 / 60).toFixed(2)} {t('hour')}</td>
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
      <DocumentTitle title={`${t('statistics')} - LeanTicket`} />
      <Table>
        <thead>
          <td>{t('ticket')} ID</td>
          <td>{t('firstReplyTime')}</td>
          <td>{t('averageReplyTime')}</td>
          <td>{t('replyCount')}</td>
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
  t: PropTypes.func
}

export default translate(CSStatsUser)
