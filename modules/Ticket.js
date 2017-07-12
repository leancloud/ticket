/*global UUID*/
import moment from 'moment'
import _ from 'lodash'
import xss from 'xss'
import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {FormGroup, ControlLabel, FormControl, Label, Alert, Button, ButtonToolbar, Radio} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

import common, {UserLabel, TicketStatusLabel, isTicketOpen} from './common'
import UpdateTicket from './UpdateTicket'
import css from './Ticket.css'
import csCss from './CustomerServiceTickets.css'
import DocumentTitle from 'react-document-title'

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
    return new AV.Query('Ticket')
    .equalTo('nid', parseInt(this.props.params.nid))
    .include('author')
    .include('files')
    .first()
    .then(ticket => {
      if (!ticket) {
        return this.props.router.replace({
          pathname: '/error',
          state: { code: 'Unauthorized' }
        })
      }

      return Promise.all([
        this.getReplyQuery(ticket).find(),
        new AV.Query('Tag').equalTo('ticket', ticket).find(),
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
    .catch(this.context.addNotification)
  }

  componentWillUnmount() {
    if (this.replyLiveQuery) {
      Promise.all([
        this.replyLiveQuery.unsubscribe(),
        this.opsLogLiveQuery.unsubscribe()
      ])
      .catch(this.context.addNotification)
    }
  }

  getReplyQuery(ticket) {
    const replyQuery = new AV.Query('Reply')
    .equalTo('ticket', ticket)
    .include('author')
    .include('files')
    replyQuery.subscribe({subscriptionId: UUID}).then(liveQuery => {
      this.replyLiveQuery = liveQuery
      this.replyLiveQuery.on('create', reply => {
        reply.fetch({include: 'author,files'})
        .then(() => {
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
    opsLogQuery.subscribe({subscriptionId: UUID}).then(liveQuery => {
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
    .catch(this.context.addNotification)
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
      <div dangerouslySetInnerHTML={{__html: xss(content)}} />
    )
  }

  ticketTimeline(avObj) {
    if (avObj.className === 'OpsLog') {
      switch (avObj.get('action')) {
      case 'selectAssignee':
        return (
          <p className='ticket-status' id={avObj.id} key={avObj.id}>
            <span className='icon-wrap'><span className='glyphicon glyphicon-transfer'></span></span> 系统于 <a href={'#' + avObj.id} className="timestamp" title={moment(avObj.get('createdAt')).format()}>{moment(avObj.get('createdAt')).fromNow()}</a> 将工单分配给 <UserLabel user={avObj.get('data').assignee} /> 处理
          </p>
        )
      case 'changeCategory':
        return (
          <p className='ticket-status' id={avObj.id} key={avObj.id}>
            <span className='icon-wrap'><span className='glyphicon glyphicon-transfer'></span></span> <UserLabel user={avObj.get('data').operator} /> 于 <a href={'#' + avObj.id} className="timestamp" title={moment(avObj.get('createdAt')).format()}>{moment(avObj.get('createdAt')).fromNow()}</a> 将工单类别改为 <span className={csCss.category + ' ' + css.category}>{avObj.get('data').category.name}</span>
          </p>
        )
      case 'changeAssignee':
        return (
          <p className='ticket-status' id={avObj.id} key={avObj.id}>
            <span className='icon-wrap'><span className='glyphicon glyphicon-transfer'></span></span> <UserLabel user={avObj.get('data').operator} /> 于 <a href={'#' + avObj.id} className="timestamp" title={moment(avObj.get('createdAt')).format()}>{moment(avObj.get('createdAt')).fromNow()}</a> 将工单负责人改为 <UserLabel user={avObj.get('data').assignee} />
          </p>
        )
      case 'replyWithNoContent':
        return (
          <p className='ticket-status' id={avObj.id} key={avObj.id}>
            <span className='icon-wrap'><span className='glyphicon glyphicon-comment'></span></span> <UserLabel user={avObj.get('data').operator} /> 于 <a href={'#' + avObj.id} className="timestamp" title={moment(avObj.get('createdAt')).format()}>{moment(avObj.get('createdAt')).fromNow()}</a> 认为该工单暂时无需回复，如有问题可以回复该工单
          </p>
        )
      case 'replySoon':
        return (
          <p className='ticket-status' id={avObj.id} key={avObj.id}>
            <span className='icon-wrap awaiting'><span className='glyphicon glyphicon-hourglass'></span></span> <UserLabel user={avObj.get('data').operator} /> 于 <a href={'#' + avObj.id} className="timestamp" title={moment(avObj.get('createdAt')).format()}>{moment(avObj.get('createdAt')).fromNow()}</a> 认为该工单处理需要一些时间，稍后会回复该工单
          </p>
        )
      case 'resolve':
        return (
          <p className='ticket-status' id={avObj.id} key={avObj.id}>
            <span className='icon-wrap resolved'><span className='glyphicon glyphicon-ok-circle'></span></span> <UserLabel user={avObj.get('data').operator} /> 于 <a href={'#' + avObj.id} className="timestamp" title={moment(avObj.get('createdAt')).format()}>{moment(avObj.get('createdAt')).fromNow()}</a> 认为该工单已经解决
          </p>
        )
      case 'reject':
        return (
          <p className='ticket-status' id={avObj.id} key={avObj.id}>
            <span className='icon-wrap closed'><span className='glyphicon glyphicon-ban-circle'></span></span> <UserLabel user={avObj.get('data').operator} /> 于 <a href={'#' + avObj.id} className="timestamp" title={moment(avObj.get('createdAt')).format()}>{moment(avObj.get('createdAt')).fromNow()}</a> 关闭了该工单
          </p>
        )
      case 'reopen':
        return (
          <p className='ticket-status' id={avObj.id} key={avObj.id}>
            <span className='icon-wrap reopened'><span className='glyphicon glyphicon-record'></span></span> <UserLabel user={avObj.get('data').operator} /> 于 <a href={'#' + avObj.id} className="timestamp" title={moment(avObj.get('createdAt')).format()}>{moment(avObj.get('createdAt')).fromNow()}</a> 重新打开该工单
          </p>
        )
      }
    } else {
      let panelFooter = <div></div>
      let imgBody = <div></div>
      const files = avObj.get('files')
      if (files && files.length !== 0) {
        const imgFiles = []
        const otherFiles = []
        files.forEach(f => {
          const mimeType = f.get('mime_type')
          if (['image/png', 'image/jpeg'].indexOf(mimeType) != -1) {
            imgFiles.push(f)
          } else {
            otherFiles.push(f)
          }
        })

        if (imgFiles.length > 0) {
          imgBody = imgFiles.map(f => {
            return <img key={f.id} src={f.get('url')} alt={f.get('name')} />
          })
        }

        if (otherFiles.length > 0) {
          const fileLinks = otherFiles.map(f => {
            return <span key={f.id}><a href={f.url()} target='_blank'><span className="glyphicon glyphicon-paperclip"></span> {f.get('name')}</a> </span>
          })
          panelFooter = <div className="panel-footer">{fileLinks}</div>
        }
      }
      const panelClass = `panel ${css.item} ${(avObj.get('isCustomerService') ? css.panelModerator : 'panel-common')}`
      const userLabel = avObj.get('isCustomerService') ? <span><UserLabel user={avObj.get('author')} /><i className={css.badge}>客服</i></span> : <UserLabel user={avObj.get('author')} />
      return (
        <div id={avObj.id} key={avObj.id} className={panelClass}>
          <div className={ 'panel-heading ' + css.heading }>
          {userLabel} 提交于 <a href={'#' + avObj.id} className="timestamp" title={moment(avObj.get('createdAt')).format()}>{moment(avObj.get('createdAt')).fromNow()}</a>
          </div>
          <div className={ 'panel-body ' + css.content }>
            {this.contentView(avObj.get('content_HTML'))}
            {imgBody}
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
          <ControlLabel>工单操作</ControlLabel>
          <FormGroup>
            <button type="button" className='btn btn-default' onClick={() => this.operateTicket('resolve')}>已解决</button>
            {' '}
            <button type="button" className='btn btn-default' onClick={() => this.operateTicket('reject')}>关闭</button>
          </FormGroup>
        </FormGroup>
      )
    } else if (ticketStatus === TICKET_STATUS.PRE_FULFILLED && !this.props.isCustomerService) {
      optionButtons = (
        <Alert bsStyle="warning">
          <ControlLabel>我们的工程师认为该工单已解决，请确认：</ControlLabel>
          <Button bsStyle="primary" onClick={() => this.operateTicket('resolve')}>确认已解决</Button>
          {' '}
          <Button onClick={() => this.operateTicket('reopen')}>未解决</Button>
        </Alert>
      )
    } else {
      optionButtons = (
        <FormGroup>
          <ControlLabel>工单操作</ControlLabel>
          <FormGroup>
            <button type="button" className='btn btn-default' onClick={() => this.operateTicket('reopen')}>重新打开</button>
          </FormGroup>
        </FormGroup>
      )
    }

    return (
      <div>
        <div className="row">
          <div className="col-sm-12">
            <DocumentTitle title={this.state.ticket.get('title') + ' - LeanTicket' || 'LeanTicket'} />
            <h1>{this.state.ticket.get('title')} <small>#{this.state.ticket.get('nid')}</small></h1>
            <div>
              <TicketStatusLabel status={this.state.ticket.get('status')} /> <span>
                <UserLabel user={this.state.ticket.get('author')} /> 创建于 <span title={moment(this.state.ticket.get('createdAt')).format()}>{moment(this.state.ticket.get('createdAt')).fromNow()}</span>
                {moment(this.state.ticket.get('createdAt')).fromNow() === moment(this.state.ticket.get('updatedAt')).fromNow() ||
                  <span>，更新于 <span title={moment(this.state.ticket.get('updatedAt')).format()}>{moment(this.state.ticket.get('updatedAt')).fromNow()}</span></span>
                }
              </span>
            </div>
            <hr />
          </div>
        </div>

        <div className="row">
          <div className="col-sm-8">
            <div className="tickets">
              {this.ticketTimeline(this.state.ticket)}
              <div>{timeline}</div>
            </div>

            {isTicketOpen(this.state.ticket) &&
              <div>
                <hr />

                <TicketReply
                  ticket={this.state.ticket}
                  commitReply={this.commitReply.bind(this)}
                  commitReplySoon={this.commitReplySoon.bind(this)}
                  operateTicket={this.operateTicket.bind(this)}
                  isCustomerService={this.props.isCustomerService}
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
                />
              </div>
            }
          </div>

          <div className={'col-sm-4 ' + css.sidebar}>
            <div>{tags}</div>

            {isTicketOpen(this.state.ticket) &&
              <div>
                <UpdateTicket ticket={this.state.ticket}
                  isCustomerService={this.props.isCustomerService}
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
  router: PropTypes.object,
  isCustomerService: PropTypes.bool,
  params: PropTypes.object,
}

Ticket.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

class TicketReply extends Component {
  constructor(props) {
    super(props)
    this.state = {
      reply: localStorage.getItem(`ticket:${this.props.ticket.id}:reply`) || '',
      files: [],
      isCommitting: false,
    }
  }

  handleReplyOnChange(e) {
    localStorage.setItem(`ticket:${this.props.ticket.id}:reply`, e.target.value)
    this.setState({reply: e.target.value})
  }

  handleReplyCommit(e) {
    e.preventDefault()
    this.setState({isCommitting: true})
    this.props.commitReply(this.state.reply, this.fileInput.files)
    .then(() => {
      localStorage.removeItem(`ticket:${this.props.ticket.id}:reply`)
      this.setState({reply: ''})
      this.fileInput.value = ''
    })
    .catch(this.context.addNotification)
    .then(() => {
      this.setState({isCommitting: false})
    })
  }

  handleReplySoon(e) {
    e.preventDefault()
    this.setState({isCommitting: true})
    this.props.commitReplySoon(this.state.reply, this.fileInput.files)
    .then(() => {
      localStorage.removeItem(`ticket:${this.props.ticket.id}:reply`)
      this.setState({reply: ''})
      this.fileInput.value = ''
    })
    .catch(this.context.addNotification)
    .then(() => {
      this.setState({isCommitting: false})
    })
  }

  handleReplyNoContent(e) {
    e.preventDefault()
    this.setState({isCommitting: true})
    this.props.operateTicket('replyWithNoContent')
    .catch(this.context.addNotification)
    .then(() => {
      this.setState({isCommitting: false})
    })
  }

  render() {
    let buttons
    if (this.props.isCustomerService) {
      buttons = (
        <ButtonToolbar>
          <Button onClick={this.handleReplyCommit.bind(this)} disabled={this.state.isCommitting}>回复</Button>
          <Button onClick={this.handleReplySoon.bind(this)} disabled={this.state.isCommitting}>稍后继续回复</Button>
          <Button onClick={this.handleReplyNoContent.bind(this)} disabled={this.state.isCommitting}>暂无需回复</Button>
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
      <form className="form-group">
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
}

TicketReply.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

class Tag extends Component{

  componentDidMount() {
    if (this.props.tag.get('key') === 'appId') {
      const appId = this.props.tag.get('value')
      if (!appId) {
        return
      }
      return AV.Cloud.run('getLeanCloudApp', {
        username: this.props.ticket.get('author').get('username'),
        appId,
      })
      .then((app) => {
        this.setState({key: '应用', value: app.app_name})
        if (this.props.isCustomerService) {
          return AV.Cloud.run('getLeanCloudAppUrl', {appId})
          .then((url) => {
            if (url) {
              this.setState({url})
            }
          })
        }
      })
      .catch(this.context.addNotification)
    }
  }

  render() {
    if (!this.state) {
      return <div className="form-group">
        <Label bsStyle="default">{this.props.tag.get('key')}: {this.props.tag.get('value')}</Label>
      </div>
    } else {
      if (this.state.url) {
        return <div>
          <label className="control-label">
            {this.state.key}链接
          </label>
          <div className="form-group">
            <a className="btn btn-default" href={this.state.url} target='_blank'>
              {this.state.value}
            </a>
          </div>
        </div>
      }
      return <div>
        <label className="control-label">
          {this.state.key}
        </label>
        <div className="form-group">
          <a className="btn btn-default disabled">
            {this.state.value}
          </a>
        </div>
      </div>
    }
  }

}

Tag.propTypes = {
  tag: PropTypes.instanceOf(AV.Object).isRequired,
  ticket: PropTypes.object.isRequired,
  isCustomerService: PropTypes.bool,
}

Tag.contextTypes = {
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
    .catch(this.context.addNotification)
  }

  render() {
    const evaluation = this.props.ticket.get('evaluation')
    if (evaluation) {
      return <Alert bsStyle="warning">
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
      return <Alert bsStyle="warning">
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
}

Evaluation.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}
