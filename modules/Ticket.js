import moment from 'moment'
import _ from 'lodash'
import xss from 'xss'
import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {FormGroup, FormControl, Label, Alert, Button, ButtonToolbar} from 'react-bootstrap'
import AV from 'leancloud-storage'

import common, {UserLabel, TicketStatusLabel, isTicketOpen} from './common'
import UpdateTicket from './UpdateTicket'
import Notification from './notification'

import { TICKET_STATUS } from '../lib/constant'

export default class Ticket extends Component {

  delayRefreshOpsLogs() {
    return new Promise((resovle) => {
      setTimeout(() => {
        resovle()
      }, 500)
    })
    .then(() => {
      return new AV.Query('OpsLog')
      .equalTo('ticket', this.state.ticket)
      .ascending('createdAt')
      .find()
    }).then((opsLogs) => {
      this.setState({opsLogs})
    })
  }

  constructor(props) {
    super(props)
    this.state = {
      ticket: null,
      replies: [],
      opsLogs: [],
      categories: [],
    }
  }

  componentDidMount() {
    AV.Cloud.run('getTicketAndRepliesView', {nid: parseInt(this.props.params.nid)})
    .then(({ticket, replies}) => {
      ticket = AV.parseJSON(ticket)
      Promise.all([
        new AV.Query('Tag')
          .equalTo('ticket', ticket)
          .find(),
        new AV.Query('OpsLog')
          .equalTo('ticket', ticket)
          .ascending('createdAt')
          .find()
      ])
      .then(([tags, opsLogs]) => {
        this.setState({
          ticket,
          replies: replies.map(AV.parseJSON),
          tags,
          opsLogs,
        })
        return Notification.getClient().then(client =>
          client.getQuery().equalTo('ticket', ticket.get('nid')).find()
        ).then(([conversation]) => {
          if (conversation) {
            conversation.on('message', this.handleNotification)
            return conversation.join()
          }
        })
      })
    }).catch(console.error)
  }

  handleNotification(message) {
    // 只关注机器人发的消息
    // TODO: 为了防止伪造，需要使用登录签名阻止所有试图使用机器人 id 登录的行为，既机器人的消息只能通过 Rest API + masterKey 发出
    if (message.from !== 'LeanTicket Bot') return
    console.log(message)
    // TODO: fetch change and update UI
  }

  commitReply(reply, files) {
    return common.uploadFiles(files)
    .then((files) => {
      if (reply.trim() === '' && files.length == 0) {
        return
      }
      return new AV.Object('Reply').save({
        ticket: this.state.ticket,
        content: reply,
        files,
      }).then((reply) => {
        return AV.Cloud.run('getReplyView', {objectId: reply.id})
      }).then((reply) => {
        const replies = this.state.replies
        replies.push(AV.parseJSON(reply))
        this.setState({replies})
      })
    })
  }

  commitReplySoon(reply, files) {
    this.commitReply(reply, files)
    .then(() => {
      return AV.Cloud.run('replySoon', {ticketId: this.state.ticket.id})
      .then((ticket) => {
        this.setState({ticket: AV.parseJSON(ticket)})
        return this.delayRefreshOpsLogs()
      })
    })
  }

  commitReplyNoContent() {
    return AV.Cloud.run('replyWithNoContent', {ticketId: this.state.ticket.id})
    .then((ticket) => {
      this.setState({ticket: AV.parseJSON(ticket)})
      return this.delayRefreshOpsLogs()
    })
  }

  handleStatusChange(status) {
    return this.state.ticket.set('status', status).save()
    .then((ticket) => {
      this.setState({ticket})
      return this.delayRefreshOpsLogs()
    }).catch(console.error)
  }

  updateTicketCategory(category) {
    this.state.ticket.set('category', common.getTinyCategoryInfo(category)).save()
    .then((ticket) => {
      this.setState({ticket})
      return this.delayRefreshOpsLogs()
    })
  }

  updateTicketAssignee(assignee) {
    this.state.ticket.set('assignee', assignee).save()
    .then((ticket) => {
      this.setState({ticket})
      return this.delayRefreshOpsLogs()
    })
  }

  contentView(content) {
    return (
      <table>
        <tbody>
          <tr>
            <td dangerouslySetInnerHTML={{__html: xss(content)}} />
          </tr>
        </tbody>
      </table>
    )
  }

  ticketTimeline(avObj) {
    if (avObj.className === 'OpsLog') {
      switch (avObj.get('action')) {
      case 'selectAssignee':
        return (
          <p key={avObj.id}>
            系统 于 {moment(avObj.get('createdAt')).fromNow()} 将工单分配给 <UserLabel user={avObj.get('data').assignee} /> 处理。
          </p>
        )
      case 'changeStatus':
        return (
          <p key={avObj.id}>
            <UserLabel user={avObj.get('data').operator} /> 于 {moment(avObj.get('createdAt')).fromNow()} 将工单状态修改为 <TicketStatusLabel status={avObj.get('data').status} /> 。
          </p>
        )
      case 'changeCategory':
        return (
          <p key={avObj.id}>
            <UserLabel user={avObj.get('data').operator} /> 于 {moment(avObj.get('createdAt')).fromNow()} 将工单类别改为 {avObj.get('data').category.name} 。
          </p>
        )
      case 'changeAssignee':
        return (
          <p key={avObj.id}>
            <UserLabel user={avObj.get('data').operator} /> 于 {moment(avObj.get('createdAt')).fromNow()} 将工单负责人改为 <UserLabel user={avObj.get('data').assignee} /> 。
          </p>
        )
      case 'replyWithNoContent':
        return (
          <p key={avObj.id}>
            <UserLabel user={avObj.get('data').operator} /> 于 {moment(avObj.get('createdAt')).fromNow()} 认为该工单暂时无需回复，如有问题可以回复该工单。
          </p>
        )
      case 'replySoon':
        return (
          <p key={avObj.id}>
            <UserLabel user={avObj.get('data').operator} /> 于 {moment(avObj.get('createdAt')).fromNow()} 认为该工单处理需要一些时间，稍后会回复该工单。
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
      const panelClass = 'panel ' + (avObj.get('isCustomerService') ? 'panel-info' : 'panel-success')
      const userLabel = avObj.get('isCustomerService') ? <span>客服 <UserLabel user={avObj.get('author')} /></span> : <UserLabel user={avObj.get('author')} />
      return (
        <div key={avObj.id} className={panelClass}>
          <div className="panel-heading">
          {userLabel} 于 {moment(avObj.get('createdAt')).fromNow()}提交
          </div>
          <div className="panel-body">
            {this.contentView(avObj.get('contentHtml'))}
          </div>
          {panelFooter}
        </div>
      )
    }
  }

  render() {
    if (this.state.ticket === null) {
      return (
      <div>读取中……</div>
      )
    }

    const tags = this.state.tags.map((tag) => {
      return <Tag key={tag.id} tag={tag} ticket={this.state.ticket} isCustomerService={this.props.isCustomerService} />
    })

    const timeline = _.chain(this.state.replies)
      .concat(this.state.opsLogs)
      .sortBy((data) => {
        return data.get('createdAt')
      }).map(this.ticketTimeline.bind(this))
      .value()
    let optionButtons
    const ticketStatus = this.state.ticket.get('status')
    if (isTicketOpen(this.state.ticket)) {
      optionButtons = (
        <FormGroup>
          <button type="button" className='btn btn-default' onClick={() => this.handleStatusChange(this.props.isCustomerService ? TICKET_STATUS.PRE_FULFILLED : TICKET_STATUS.FULFILLED)}>已解决</button>
          {' '}
          <button type="button" className='btn btn-default' onClick={() => this.handleStatusChange(TICKET_STATUS.REJECTED)}>关闭</button>
        </FormGroup>
      )
    } else if (ticketStatus === TICKET_STATUS.PRE_FULFILLED && !this.props.isCustomerService) {
      optionButtons = (
        <Alert>
          <p>我们的工程师认为该工单已解决，请确认：</p>
          <Button bsStyle="success" onClick={() => this.handleStatusChange(TICKET_STATUS.FULFILLED)}>已解决</Button>
          {' '}
          <Button onClick={() => this.handleStatusChange(TICKET_STATUS.WAITING_CUSTOMER)}>未解决</Button>
        </Alert>
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
        <h1>{this.state.ticket.get('title')} <small>#{this.state.ticket.get('nid')}</small></h1>
        <div>
          <TicketStatusLabel status={this.state.ticket.get('status')} /> <span><UserLabel user={this.state.ticket.get('author')} /> 于 {moment(this.state.ticket.get('createdAt')).fromNow()}创建该工单</span>
        </div>
        <div>{tags}</div>
        <hr />
        {this.ticketTimeline(this.state.ticket)}
        <div>{timeline}</div>
        <hr />
        {isTicketOpen(this.state.ticket) &&
          <div>
            <p>
              <TicketReply commitReply={this.commitReply.bind(this)}
                commitReplySoon={this.commitReplySoon.bind(this)}
                commitReplyNoContent={this.commitReplyNoContent.bind(this)}
                isCustomerService={this.props.isCustomerService}
              />
            </p>
            <p>
              <UpdateTicket ticket={this.state.ticket}
                isCustomerService={this.props.isCustomerService}
                updateTicketCategory={this.updateTicketCategory.bind(this)}
                updateTicketAssignee={this.updateTicketAssignee.bind(this)} />
            </p>
          </div>
        }
        {optionButtons}
      </div>
    )
  }

}

Ticket.propTypes = {
  isCustomerService: PropTypes.bool,
  params: PropTypes.object,
}

class TicketReply extends Component {
  constructor(props) {
    super(props)
    this.state = {
      reply: '',
      files: [],
    }
  }

  handleReplyOnChange(e) {
    this.setState({reply: e.target.value})
  }

  handleReplyCommit(e) {
    e.preventDefault()
    this.props.commitReply(this.state.reply, this.fileInput.files)
    .then(() => {
      this.setState({reply: ''})
      this.fileInput.value = ''
    }).catch(console.error)
  }

  handleReplySoon(e) {
    e.preventDefault()
    this.props.commitReplySoon(this.state.reply, this.fileInput.files)
    .catch(console.error)
  }

  handleReplyNoContent(e) {
    e.preventDefault()
    this.props.commitReplyNoContent()
    .catch(console.error)
  }

  render() {
    let buttons
    if (this.props.isCustomerService) {
      buttons = (
        <ButtonToolbar>
          <Button onClick={this.handleReplyCommit.bind(this)}>回复</Button>
          <Button onClick={this.handleReplySoon.bind(this)}>稍后继续回复</Button>
          <Button onClick={this.handleReplyNoContent.bind(this)}>暂无需回复</Button>
        </ButtonToolbar>
      )
    } else {
      buttons = (
        <ButtonToolbar>
          <Button onClick={this.handleReplyCommit.bind(this)}>回复</Button>
        </ButtonToolbar>
      )
    }
    return (
      <form>
        <FormGroup>
          <FormControl componentClass="textarea" placeholder="回复内容……" rows="8" value={this.state.reply} onChange={this.handleReplyOnChange.bind(this)}/>
        </FormGroup>
        <FormGroup>
          <FormControl type="file" multiple inputRef={ref => this.fileInput = ref} />
          <p className="help-block">上传附件可以多选</p>
        </FormGroup>
        {buttons}
      </form>
    )
  }
}

TicketReply.propTypes = {
  commitReply: PropTypes.func.isRequired,
  commitReplySoon: PropTypes.func.isRequired,
  commitReplyNoContent: PropTypes.func.isRequired,
  isCustomerService: PropTypes.bool,
}

class Tag extends Component{

  componentDidMount() {
    if (this.props.tag.get('key') === 'appId') {
      const appId = this.props.tag.get('value')
      AV.Cloud.run('getLeanCloudApp', {
        username: this.props.ticket.get('author').get('username'),
        appId,
      })
      .then((app) => {
        this.setState({key: '应用', value: app.app_name})
        if (this.props.isCustomerService) {
          AV.Cloud.run('getLeanCloudAppUrl', {appId})
          .then((url) => {
            this.setState({url})
          })
        }
      })
    }
  }

  render() {
    if (!this.state) {
      return <Label bsStyle="default">{this.props.tag.get('key')} : {this.props.tag.get('value')}</Label>
    } else {
      if (this.state.url) {
        return <a href={this.state.url} target='_blank'><Label bsStyle="default">{this.state.key} : {this.state.value}</Label></a>
      }
      return <Label bsStyle="default">{this.state.key} : {this.state.value}</Label>
    }
  }

}

Tag.propTypes = {
  tag: PropTypes.instanceOf(AV.Object).isRequired,
  ticket: PropTypes.object.isRequired,
  isCustomerService: PropTypes.bool,
}
