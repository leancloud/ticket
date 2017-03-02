import React from 'react'
import AV from 'leancloud-storage'
import moment from 'moment'
import Promise from 'bluebird'
import _ from 'lodash'

import UpdateTicket from './UpdateTicket'
const common = require('../common')

import {TICKET_STATUS_OPEN, TICKET_STATUS_CLOSED} from '../../lib/constant'

export default React.createClass({
  delayRefreshOpsLogs() {
    return Promise.delay(500)
    .then(() => {
      return new AV.Query('OpsLog')
      .equalTo('ticket', this.state.ticket)
      .ascending('createdAt')
      .find()
    }).then((opsLogs) => {
      this.setState({opsLogs})
    })
  },
  getInitialState() {
    return {
      ticket: null,
      replies: [],
      opsLogs: [],
      reply: '',
      categories: [],
    }
  },
  componentDidMount() {
    common.getTicketAndRelation(this.props.params.nid)
    .then(({ticket, replies, opsLogs}) => {
      this.setState({ticket, replies, opsLogs})
    }).catch((err) => {
      alert(err.stack)
    })
  },
  componentWillReceiveProps(nextProps) {
    common.getTicketAndRelation(nextProps.params.nid)
    .then(({ticket, replies, opsLogs}) => {
      this.setState({ticket, replies, opsLogs})
    }).catch((err) => {
      alert(err.stack)
    })
  },
  handleReplyOnChange(e) {
    this.setState({reply: e.target.value})
  },
  handleReplyCommit(e) {
    e.preventDefault()
    const replyFile = $('#replyFile')[0]
    common.uploadFiles(replyFile.files)
    .then((files) => {
      return new AV.Object('Reply').save({
        ticket: this.state.ticket,
        content: this.state.reply,
        files,
      })
    }).then((reply) => {
      return reply.fetch({
        include: 'author,files',
      })
    }).then((reply) => {
      this.setState({reply: ''})
      replyFile.value = ''
      const replies = this.state.replies
      replies.push(reply)
      this.setState({replies})
    }).catch((err) => {
      alert(err.stack)
    })
  },
  handleTicketClose() {
    this.state.ticket.set('status', TICKET_STATUS_CLOSED).save()
    .then((ticket) => {
      this.setState({ticket})
      return this.delayRefreshOpsLogs()
    })
  },
  updateTicketCategory(category) {
    this.state.ticket.set('category', common.getTinyCategoryInfo(category)).save()
    .then((ticket) => {
      this.setState({ticket})
      return this.delayRefreshOpsLogs()
    })
  },
  updateTicketAssignee(assignee) {
    this.state.ticket.set('assignee', assignee).save()
    .then((ticket) => {
      this.setState({ticket})
      return this.delayRefreshOpsLogs()
    })
  },
  handleTicketReopen() {
    this.state.ticket.set('status', TICKET_STATUS_OPEN).save()
    .then((ticket) => {
      this.setState({ticket})
      this.delayRefreshOpsLogs()
    })
  },
  render() {
    if (this.state.ticket === null) {
      return (
      <div>读取中……</div>
      )
    }
    const timeline = _.chain(this.state.replies)
      .concat(this.state.opsLogs)
      .sortBy((data) => {
        return data.get('createdAt')
      }).map(common.ticketTimeline)
      .value()
    let optionButtons, statusLabel
    if (this.state.ticket.get('status') == TICKET_STATUS_OPEN) {
      statusLabel = <span className="label label-success">Open</span>
      optionButtons = <button type="button" className='btn btn-default' onClick={this.handleTicketClose}>关闭</button>
    } else {
      statusLabel = <span className="label label-danger">Closed</span>
      optionButtons = <button type="button" className='btn btn-default' onClick={this.handleTicketReopen}>重新打开</button>
    }
    return (
      <div>
        <h2>{this.state.ticket.get('title')} <small>#{this.state.ticket.get('nid')}</small></h2>
        <div>
          {statusLabel} <span>{common.userLabel(this.state.ticket.get('author'))} 于 {moment(this.state.ticket.get('createdAt')).fromNow()}创建该工单</span>
        </div>
        <hr />
        {common.ticketTimeline(this.state.ticket)}
        <div>{timeline}</div>
        <hr />
        <UpdateTicket ticket={this.state.ticket}
          updateTicketCategory={this.updateTicketCategory}
          updateTicketAssignee={this.updateTicketAssignee} />
        <div>
          <form onSubmit={this.handleReplyCommit}>
            <div className="form-group">
              <textarea className="form-control" rows="8" placeholder="回复内容……" value={this.state.reply} onChange={this.handleReplyOnChange}></textarea>
            </div>
            <div className="form-group">
              <input id="replyFile" type="file" multiple />
            </div>
            <button type="submit" className='btn btn-primary'>回复</button>
            {optionButtons}
          </form>
        </div>
      </div>
    )
  }
})
