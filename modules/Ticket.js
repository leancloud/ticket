import React from 'react'
import moment from 'moment'
import _ from 'lodash'
import Promise from 'bluebird'
import Remarkable from 'remarkable'
import hljs from 'highlight.js'
import xss from 'xss'
import {FormGroup} from 'react-bootstrap'
import AV from 'leancloud-storage'

import common, {TicketStatusLabel, TicketReplyLabel} from './common'
import UpdateTicket from './UpdateTicket'
import Notification from './notification'

import { TICKET_STATUS } from '../lib/constant'

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
      return Notification.getClient().then(client =>
        client.getQuery().equalTo('ticket', ticket.get('nid')).find()
      ).then(([conversation]) => {
        if (conversation) {
          conversation.on('message', this.handleNotification)
          return conversation.join()
        }
      })
    }).catch(console.error)
  },
  handleNotification(message) {
    // 只关注机器人发的消息
    // TODO: 为了防止伪造，需要使用登录签名阻止所有试图使用机器人 id 登录的行为，既机器人的消息只能通过 Rest API + masterKey 发出
    if (message.from !== 'LeanTicket Bot') return
    console.log(message)
    // TODO: fetch change and update UI
  },
  handleReplyOnChange(e) {
    this.setState({reply: e.target.value})
  },
  commitReply() {
    const replyFile = $('#replyFile')[0]
    return common.uploadFiles(replyFile.files)
    .then((files) => {
      if (this.state.reply.trim() === '' && files.length == 0) {
        return
      }
      return new AV.Object('Reply').save({
        ticket: this.state.ticket,
        content: this.state.reply,
        files,
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
      })
    })
  },
  handleReplyCommit(e) {
    e.preventDefault()
    this.commitReply().catch(console.error)
  },
  handleStatusChange(status) {
    this.commitReply().then(() => {
      return this.state.ticket.set('status', status).save()
    }).then((ticket) => {
      this.setState({ticket})
      return this.delayRefreshOpsLogs()
    }).catch(console.error)
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
  contentView(content) {
    const md = new Remarkable({
      html: true,
      breaks: true,
      linkify: true,
      typographer: true,
      highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(lang, str).value
          } catch (err) {
            // ignore
          }
        }
        try {
          return hljs.highlightAuto(str).value
        } catch (err) {
          // ignore
        }
        return '' // use external default escaping
      },
    })
    return (
      <table>
        <tbody>
          <tr>
            <td dangerouslySetInnerHTML={{__html: md.render(xss(content))}} />
          </tr>
        </tbody>
      </table>
    )
  },
  ticketTimeline(avObj) {
    if (avObj.className === 'OpsLog') {
      switch (avObj.get('action')) {
      case 'selectAssignee':
        return (
          <p key={avObj.id}>
            系统 于 {moment(avObj.get('createdAt')).fromNow()} 将工单分配给 {common.userLabel(avObj.get('data').assignee)} 处理
          </p>
        )
      case 'changeStatus':
        return (
          <p key={avObj.id}>
            {common.userLabel(avObj.get('data').operator)} 于 {moment(avObj.get('createdAt')).fromNow()} 将工单状态修改为 <TicketStatusLabel status={avObj.get('data').status} />
          </p>
        )
      case 'changeCategory':
        return (
          <p key={avObj.id}>
            {common.userLabel(avObj.get('data').operator)} 于 {moment(avObj.get('createdAt')).fromNow()} 将工单类别改为 {avObj.get('data').category.name}
          </p>
        )
      case 'changeAssignee':
        return (
          <p key={avObj.id}>
            {common.userLabel(avObj.get('data').operator)} 于 {moment(avObj.get('createdAt')).fromNow()} 将工单负责人改为 {common.userLabel(avObj.get('data').assignee)}
          </p>
        )
      }
    } else {
      let panelFooter = <div></div>
      const files = avObj.get('files')
      if (files && files.length !== 0) {
        const fileLinks = _.map(files, (file) => {
          return (
            <span><a href={file.url()} target='_blank'><span className="glyphicon glyphicon-paperclip"></span> {file.get('name')}</a> </span>
          )
        })
        panelFooter = <div className="panel-footer">{fileLinks}</div>
      }
      return (
        <div key={avObj.id} className="panel panel-default">
          <div className="panel-heading">
            {common.userLabel(avObj.get('author'))} 于 {moment(avObj.get('createdAt')).fromNow()}提交
          </div>
          <div className="panel-body">
            {this.contentView(avObj.get('content'))}
          </div>
          {panelFooter}
        </div>
      )
    }
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
      }).map(this.ticketTimeline)
      .value()
    let optionButtons
    const ticketStatus = this.state.ticket.get('status')
    if (ticketStatus === TICKET_STATUS.NEW || ticketStatus === TICKET_STATUS.PENDING) {
      optionButtons = (
        <FormGroup>
          <button type="button" className='btn btn-default' onClick={() => this.handleStatusChange(this.props.isCustomerService ? TICKET_STATUS.PRE_FULFILLED : TICKET_STATUS.FULFILLED)}>已解决</button>
          <button type="button" className='btn btn-default' onClick={() => this.handleStatusChange(TICKET_STATUS.REJECTED)}>关闭</button>
        </FormGroup>
      )
    } else if (ticketStatus === TICKET_STATUS.PRE_FULFILLED && !this.props.isCustomerService) {
      optionButtons = (
        <FormGroup>
          <p>我们的工程师认为该工单已解决，请确认：</p>
          <button type="button" className='btn btn-default' onClick={() => this.handleStatusChange(TICKET_STATUS.FULFILLED)}>已解决</button>
          <button type="button" className='btn btn-default' onClick={() => this.handleStatusChange(TICKET_STATUS.PENDING)}>未解决</button>
        </FormGroup>
      )
    } else {
      optionButtons = (
        <FormGroup>
          <button type="button" className='btn btn-default' onClick={() => this.handleStatusChange(TICKET_STATUS.NEW)}>重新打开</button>
        </FormGroup>
      )
    }
    return (
      <div>
        <h2>{this.state.ticket.get('title')} <small>#{this.state.ticket.get('nid')}</small></h2>
        <div>
          <TicketStatusLabel status={this.state.ticket.get('status')} /> <TicketReplyLabel ticket={this.state.ticket} /> <span>{common.userLabel(this.state.ticket.get('author'))} 于 {moment(this.state.ticket.get('createdAt')).fromNow()}创建该工单</span>
        </div>
        <hr />
        {this.ticketTimeline(this.state.ticket)}
        <div>{timeline}</div>
        <hr />
        <UpdateTicket ticket={this.state.ticket}
          isCustomerService={this.props.isCustomerService}
          updateTicketCategory={this.updateTicketCategory}
          updateTicketAssignee={this.updateTicketAssignee} />
        {optionButtons}
        <div>
          <form>
            <div className="form-group">
              <textarea className="form-control" rows="8" placeholder="回复内容……" value={this.state.reply} onChange={this.handleReplyOnChange}></textarea>
            </div>
            <div className="form-group">
              <input id="replyFile" type="file" multiple />
            </div>
            <button type="button" className='btn btn-default' onClick={this.handleReplyCommit}>回复</button>
          </form>
        </div>
      </div>
    )
  }
})
