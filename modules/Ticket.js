import moment from 'moment'
import _ from 'lodash'
import xss from 'xss'
import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {FormGroup, FormControl, Label, Alert, Button, ButtonToolbar, Radio} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

import common, {UserLabel, TicketStatusLabel, isTicketOpen} from './common'
import UpdateTicket from './UpdateTicket'
import css from './Ticket.css'

import { TICKET_STATUS } from '../lib/constant'

export default class Ticket extends Component {

  constructor(props) {
    super(props)
    this.state = {
      ticket: null,
      replies: [],
      opsLogs: [],
    }
  }

  componentDidMount() {
    AV.Cloud.run('getTicket', {nid: parseInt(this.props.params.nid)})
    .then(ticket => {
      return Promise.all([
        this.getReplyQuery(ticket).find().then(this.onRepliesCreate),
        new AV.Query('Tag')
          .equalTo('ticket', ticket)
          .find(),
        this.getOpsLogQuery(ticket).find(),
      ])
      .then(([replies, tags, opsLogs]) => {
        this.setState({
          ticket,
          replies,
          tags,
          opsLogs,
        })
      })
    })
    .catch(this.props.addNotification)
  }

  componentWillUnmount() {
    Promise.all([
      this.replyLiveQuery.unsubscribe(),
      this.opsLogLiveQuery.unsubscribe()
    ])
    .catch(this.props.addNotification)
  }

  onRepliesCreate(replies) {
    const replyContents = replies.map(reply => reply.get('content'))
    return AV.Cloud.run('htmlify', {contents: replyContents})
    .then(contentHtmls => {
      replies.forEach((reply, i) => {
        reply.contentHtml = contentHtmls[i]
      })
      return replies
    })
  }

  getReplyQuery(ticket) {
    const replyQuery = new AV.Query('Reply')
    .equalTo('ticket', ticket)
    .include('author')
    .include('files')
    replyQuery.subscribe().then(liveQuery => {
      this.replyLiveQuery = liveQuery
      this.replyLiveQuery.on('create', reply => {
        this.onRepliesCreate([reply])
        .then(([reply]) => {
          const replies = this.state.replies
          replies.push(reply)
          this.setState({replies})
        })
      })
    })
    return replyQuery
  }

  getOpsLogQuery(ticket) {
    const opsLogQuery = new AV.Query('OpsLog')
    .equalTo('ticket', ticket)
    .ascending('createdAt')
    opsLogQuery.subscribe().then(liveQuery => {
      this.opsLogLiveQuery = liveQuery
      this.opsLogLiveQuery.on('create', opsLog => {
        const opsLogs = this.state.opsLogs
        opsLogs.push(opsLog)
        this.setState({opsLogs})
      })
    })
    return opsLogQuery
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
      })
    })
  }

  commitReplySoon(reply, files) {
    return this.commitReply(reply, files)
    .then(() => {
      return this.operateTicket('replySoon')
    })
  }

  operateTicket(action) {
    return AV.Cloud.run('operateTicket', {ticketId: this.state.ticket.id, action})
    .then((ticket) => {
      this.setState({ticket: AV.parseJSON(ticket)})
    })
    .catch(this.props.addNotification)
  }

  updateTicketCategory(category) {
    return this.state.ticket.set('category', common.getTinyCategoryInfo(category)).save()
    .then((ticket) => {
      this.setState({ticket})
    })
  }

  updateTicketAssignee(assignee) {
    return this.state.ticket.set('assignee', assignee).save()
    .then((ticket) => {
      this.setState({ticket})
    })
  }

  saveEvaluation(evaluation) {
    return this.state.ticket.set('evaluation', evaluation).save()
    .then((ticket) => {
      this.setState({ticket})
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
            <span className='glyphicon glyphicon-transfer'></span> 系统 于 {moment(avObj.get('createdAt')).fromNow()} 将工单分配给 <UserLabel user={avObj.get('data').assignee} /> 处理。
          </p>
        )
      case 'changeCategory':
        return (
          <p key={avObj.id}>
            <span className='glyphicon glyphicon-transfer'></span> <UserLabel user={avObj.get('data').operator} /> 于 {moment(avObj.get('createdAt')).fromNow()} 将工单类别改为 {avObj.get('data').category.name} 。
          </p>
        )
      case 'changeAssignee':
        return (
          <p key={avObj.id}>
            <span className='glyphicon glyphicon-transfer'></span> <UserLabel user={avObj.get('data').operator} /> 于 {moment(avObj.get('createdAt')).fromNow()} 将工单负责人改为 <UserLabel user={avObj.get('data').assignee} /> 。
          </p>
        )
      case 'replyWithNoContent':
        return (
          <p key={avObj.id}>
            <span className='glyphicon glyphicon-comment'></span> <UserLabel user={avObj.get('data').operator} /> 于 {moment(avObj.get('createdAt')).fromNow()} 认为该工单暂时无需回复，如有问题可以回复该工单。
          </p>
        )
      case 'replySoon':
        return (
          <p key={avObj.id}>
            <span className='glyphicon glyphicon-hourglass'></span> <UserLabel user={avObj.get('data').operator} /> 于 {moment(avObj.get('createdAt')).fromNow()} 认为该工单处理需要一些时间，稍后会回复该工单。
          </p>
        )
      case 'resolve':
        return (
          <p key={avObj.id}>
            <span className='glyphicon glyphicon-ok-circle'></span> <UserLabel user={avObj.get('data').operator} /> 于 {moment(avObj.get('createdAt')).fromNow()} 认为该工单已经解决。
          </p>
        )
      case 'reject':
        return (
          <p key={avObj.id}>
            <span className='glyphicon glyphicon-ban-circle'></span> <UserLabel user={avObj.get('data').operator} /> 于 {moment(avObj.get('createdAt')).fromNow()} 关闭了该工单。
          </p>
        )
      case 'reopen':
        return (
          <p key={avObj.id}>
            <span className='glyphicon glyphicon-record'></span> <UserLabel user={avObj.get('data').operator} /> 于 {moment(avObj.get('createdAt')).fromNow()} 重新打开该工单。
          </p>
        )
      }
    } else {
      let panelFooter = <div></div>
      const files = avObj.get('files')
      if (files && files.length !== 0) {
        const fileLinks = _.map(files, (file) => {
          return (
            <span key={file.id}><a href={file.url()} target='_blank'><span className="glyphicon glyphicon-paperclip"></span> {file.get('name')}</a> </span>
          )
        })
        panelFooter = <div className="panel-footer">{fileLinks}</div>
      }
      const panelClass = `panel ${css.item} ${(avObj.get('isCustomerService') ? 'panel-primary' : 'panel-common')}`
      const userLabel = avObj.get('isCustomerService') ? <span><UserLabel user={avObj.get('author')} /><i className={css.badge}>客服</i></span> : <UserLabel user={avObj.get('author')} />
      return (
        <div key={avObj.id} className={panelClass}>
          <div className={ 'panel-heading ' + css.heading }>
          {userLabel} 于 {moment(avObj.get('createdAt')).fromNow()}提交
          </div>
          <div className={ 'panel-body ' + css.content }>
            {this.contentView(avObj.contentHtml || avObj.get('contentHtml'))}
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
      return <Tag key={tag.id} tag={tag} ticket={this.state.ticket} isCustomerService={this.props.isCustomerService} addNotification={this.props.addNotification.bind(this)} />
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
          <button type="button" className='btn btn-default' onClick={() => this.operateTicket('resolve')}>已解决</button>
          {' '}
          <button type="button" className='btn btn-default' onClick={() => this.operateTicket('reject')}>关闭</button>
        </FormGroup>
      )
    } else if (ticketStatus === TICKET_STATUS.PRE_FULFILLED && !this.props.isCustomerService) {
      optionButtons = (
        <Alert>
          <p>我们的工程师认为该工单已解决，请确认：</p>
          <Button bsStyle="success" onClick={() => this.operateTicket('resolve')}>已解决</Button>
          {' '}
          <Button onClick={() => this.operateTicket('reopen')}>未解决</Button>
        </Alert>
      )
    } else {
      optionButtons = (
        <FormGroup>
          <button type="button" className='btn btn-default' onClick={() => this.operateTicket('reopen')}>重新打开</button>
        </FormGroup>
      )
    }

    return (
      <div>
        <div className="row">
          <div className="col-sm-12">
            <h1>{this.state.ticket.get('title')} <small>#{this.state.ticket.get('nid')}</small></h1>
            <div>
              <TicketStatusLabel status={this.state.ticket.get('status')} /> <span><UserLabel user={this.state.ticket.get('author')} /> 于 {moment(this.state.ticket.get('createdAt')).fromNow()}创建该工单</span>
            </div>
            <hr />
          </div>
        </div>

        <div className="row">
          <div className="col-sm-8">
            {this.ticketTimeline(this.state.ticket)}
            <div>{timeline}</div>

            {isTicketOpen(this.state.ticket) &&
              <div>
                <hr />

                <TicketReply
                  ticket={this.state.ticket}
                  commitReply={this.commitReply.bind(this)}
                  commitReplySoon={this.commitReplySoon.bind(this)}
                  operateTicket={this.operateTicket.bind(this)}
                  isCustomerService={this.props.isCustomerService}
                  addNotification={this.props.addNotification.bind(this)}
                />
              </div>
            }
            {!isTicketOpen(this.state.ticket) &&
              <div>
                <hr />

                <Evaluation
                  saveEvaluation={this.saveEvaluation.bind(this)}
                  ticket={this.state.ticket}
                  isCustomerService={this.props.isCustomerService}
                  addNotification={this.props.addNotification}
                />
              </div>
            }
          </div>

          <div className="col-sm-4">
            <div>{tags}</div>

            <hr />

            {isTicketOpen(this.state.ticket) &&
              <div>
                <UpdateTicket ticket={this.state.ticket}
                  isCustomerService={this.props.isCustomerService}
                  addNotification={this.props.addNotification.bind(this)}
                  updateTicketCategory={this.updateTicketCategory.bind(this)}
                  updateTicketAssignee={this.updateTicketAssignee.bind(this)}
                />
              </div>
            }
            {optionButtons}
          </div>
        </div>
      </div>
    )
  }

}

Ticket.propTypes = {
  isCustomerService: PropTypes.bool,
  params: PropTypes.object,
  addNotification: PropTypes.func.isRequired,
}

class TicketReply extends Component {
  constructor(props) {
    super(props)
    this.state = {
      reply: localStorage.getItem(`ticket:${this.props.ticket.id}:reply`) || '',
      files: [],
    }
  }

  handleReplyOnChange(e) {
    localStorage.setItem(`ticket:${this.props.ticket.id}:reply`, e.target.value)
    this.setState({reply: e.target.value})
  }

  handleReplyCommit(e) {
    e.preventDefault()
    this.props.commitReply(this.state.reply, this.fileInput.files)
    .then(() => {
      localStorage.removeItem(`ticket:${this.props.ticket.id}:reply`)
      this.setState({reply: ''})
      this.fileInput.value = ''
    })
    .catch(this.props.addNotification)
  }

  handleReplySoon(e) {
    e.preventDefault()
    this.props.commitReplySoon(this.state.reply, this.fileInput.files)
    .catch(this.props.addNotification)
  }

  handleReplyNoContent(e) {
    e.preventDefault()
    this.props.operateTicket('replyWithNoContent')
    .catch(this.props.addNotification)
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
  ticket: PropTypes.instanceOf(AV.Object),
  commitReply: PropTypes.func.isRequired,
  commitReplySoon: PropTypes.func.isRequired,
  operateTicket: PropTypes.func.isRequired,
  isCustomerService: PropTypes.bool,
  addNotification: PropTypes.func.isRequired,
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
      .catch(this.props.addNotification)
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
  addNotification: PropTypes.func.isRequired,
}

class Evaluation extends Component {

  constructor(props) {
    super(props)
    this.state = {
      isAlreadyEvaluation: false,
      star: 1,
      content: localStorage.getItem(`ticket:${this.props.ticket.id}:evaluation`) || '',
    }
  }

  handleStarChange(e) {
    this.setState({star: parseInt(e.target.value)})
  }

  handleContentChange(e) {
    localStorage.setItem(`ticket:${this.props.ticket.id}:evaluation`, e.target.value)
    this.setState({content: e.target.value})
  }

  handleSubmit(e) {
    e.preventDefault()
    this.props.saveEvaluation({
      star: this.state.star,
      content: this.state.content
    })
    .then(() => {
      localStorage.removeItem(`ticket:${this.props.ticket.id}:evaluation`)
    })
    .catch(this.props.addNotification)
  }

  render() {
    const evaluation = this.props.ticket.get('evaluation')
    if (evaluation) {
      return <Alert>
        <p>对工单处理结果的评价：</p>
        <FormGroup>
          <Radio name="radioGroup" inline disabled defaultChecked={evaluation.star === 1}><span className="glyphicon glyphicon-thumbs-up" aria-hidden="true"></span></Radio>
          {' '}
          <Radio name="radioGroup" inline disabled defaultChecked={evaluation.star === 0}><span className="glyphicon glyphicon-thumbs-down" aria-hidden="true"></span></Radio>
        </FormGroup>
        <FormGroup>
          <FormControl componentClass="textarea" rows="8" value={evaluation.content} disabled />
        </FormGroup>
      </Alert>
    }

    if (!this.props.isCustomerService) {
      return <Alert>
        <p>对工单的处理结果，您是否满意？</p>
        <form onSubmit={this.handleSubmit.bind(this)}>
          <FormGroup>
            <Radio name="radioGroup" inline value='1' onClick={this.handleStarChange.bind(this)}><span className="glyphicon glyphicon-thumbs-up" aria-hidden="true"></span></Radio>
            {' '}
            <Radio name="radioGroup" inline value='0' onClick={this.handleStarChange.bind(this)}><span className="glyphicon glyphicon-thumbs-down" aria-hidden="true"></span></Radio>
          </FormGroup>
          <FormGroup>
            <FormControl componentClass="textarea" placeholder="您可能想说些什么" rows="8" value={this.state.content} onChange={this.handleContentChange.bind(this)}/>
          </FormGroup>
          <Button type='submit'>提交</Button>
        </form>
      </Alert>
    }

    return <div></div>
  }
}

Evaluation.propTypes = {
  ticket: PropTypes.instanceOf(AV.Object),
  isCustomerService: PropTypes.bool,
  saveEvaluation: PropTypes.func.isRequired,
  addNotification: PropTypes.func.isRequired,
}
