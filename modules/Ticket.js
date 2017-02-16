import React from 'react'
import AV from 'leancloud-storage'
import moment from 'moment'
import {TICKET_STATUS_OPEN, TICKET_STATUS_CLOSED} from '../lib/constant'

const common = require('./common')

export default React.createClass({
  reloadTicketAndReplies(nid) {
    return new AV.Query('Ticket')
    .equalTo('nid', parseInt(nid))
    .include('user')
    .first()
    .then((ticket) => {
      this.setState({ticket})
      return new AV.Query('Reply')
      .equalTo('ticket', ticket)
      .include('user')
      .ascending('createdAt')
      .find()
    }).then((replies) => {
      this.setState({replies})
    }).catch((err) => {
      alert(err)
    })
  },
  getInitialState() {
    return {
      ticket: null,
      replies: [],
      reply: '',
    }
  },
  componentDidMount() {
    this.reloadTicketAndReplies(this.props.params.nid)
  },
  componentWillReceiveProps(nextProps) {
    this.reloadTicketAndReplies(nextProps.params.nid);
  },
  handleReplyOnChange(e) {
    this.setState({reply: e.target.value})
  },
  handleReplyCommit(e) {
    e.preventDefault()
    new AV.Object('Reply').save({
      ticket: this.state.ticket,
      content: this.state.reply,
    }).then((reply) => {
      return reply.fetch({
        include: 'user'
      })
    }).then((reply) => {
      this.setState({reply: ''})
      const replies = this.state.replies
      replies.push(reply)
      this.setState({replies})
    }).catch((err) => {
      alert(err)
    });
  },
  handleTicketClose() {
    this.state.ticket.set('status', TICKET_STATUS_CLOSED).save()
    .then((ticket) => {
      this.setState({ticket})
    })
  },
  handleTicketReopen() {
    this.state.ticket.set('status', TICKET_STATUS_OPEN).save()
    .then((ticket) => {
      this.setState({ticket})
    })
  },
  ticketContent(user, content) {
    return (
      <div className="panel panel-default">
        <div className="panel-heading">
          {common.userLabel(user)} 于 {moment(this.state.ticket.get('createdAt')).fromNow()}提交
        </div>
        <div className="panel-body">
          {content}
        </div>
      </div>
    )
  },
  render() {
    if (this.state.ticket === null) {
      return (
      <div>读取中……</div>
      )
    }
    const replies = this.state.replies.map((reply) => {
      return this.ticketContent(reply.get('user'), reply.get('content'))
    })
    let optionButtons, statusLabel;
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
          {statusLabel} <span>{common.userLabel(this.state.ticket.get('user'))} 于 {moment(this.state.ticket.get('createdAt')).fromNow()}创建该工单</span>
        </div>
        <hr />
        {this.ticketContent(this.state.ticket.get('user'), this.state.ticket.get('content'))}
        <div>{replies}</div>
        <hr />
        <div>
          <div className="form-group">
            <textarea className="form-control" rows="8" placeholder="回复内容……" value={this.state.reply} onChange={this.handleReplyOnChange}></textarea>
          </div>
          <button type="button" className='btn btn-primary' onClick={this.handleReplyCommit}>回复</button>
          {optionButtons}
        </div>
      </div>
    )
  }
})
