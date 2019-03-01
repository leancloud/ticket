import moment from 'moment'
import _ from 'lodash'
import xss from 'xss'
import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {FormGroup, ControlLabel, FormControl, Alert, Button, ButtonToolbar, Radio, Tooltip, OverlayTrigger} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

import {getCustomerServices, UserLabel, TicketStatusLabel, uploadFiles, getCategoryPathName, getCategoriesTree, getTinyCategoryInfo, CategoriesSelect, depthFirstSearchFind, TagForm} from './common'
import TextareaWithPreview from './components/TextareaWithPreview'
import css from './Ticket.css'
import csCss from './CustomerServiceTickets.css'
import DocumentTitle from 'react-document-title'

import {TICKET_STATUS, isTicketOpen} from '../lib/common'

// get a copy of default whiteList
const whiteList = xss.getDefaultWhiteList()

// allow class attribute for span and code tag
whiteList.span.push('class')
whiteList.code.push('class')

// specified you custom whiteList
const myxss = new xss.FilterXSS({
  whiteList,
  css: false,
})

export default class Ticket extends Component {

  constructor(props) {
    super(props)
    this.state = {
      categoriesTree: [],
      ticket: null,
      replies: [],
      opsLogs: [],
    }
  }

  componentDidMount() {
    this.getTicketQuery(parseInt(this.props.params.nid)).first()
    .then(ticket => {
      if (!ticket) {
        return this.props.router.replace({
          pathname: '/error',
          state: { code: 'Unauthorized' }
        })
      }

      return Promise.all([
        AV.Cloud.run('getPrivateTags', {ticketId: ticket.id}),
        getCategoriesTree(false),
        this.getReplyQuery(ticket).find(),
        this.getOpsLogQuery(ticket).find(),
      ])
      .then(([privateTags, categoriesTree, replies, opsLogs]) => {
        if (privateTags) {
          ticket.set('privateTags', privateTags.privateTags)
        }
        this.setState({
          categoriesTree,
          ticket,
          replies,
          opsLogs,
        })
        return
      })
    })
    .catch(this.context.addNotification)
  }

  componentWillUnmount() {
    if (this.replyLiveQuery) {
      Promise.all([
        this.ticketLiveQuery.unsubscribe(),
        this.replyLiveQuery.unsubscribe(),
        this.opsLogLiveQuery.unsubscribe()
      ])
      .catch(this.context.addNotification)
    }
  }

  getTicketQuery(nid) {
    const query = new AV.Query('Ticket')
    .equalTo('nid', nid)
    .include('author')
    .include('organization')
    .include('assignee')
    .include('files')
    .limit(1)
    query.subscribe().then(liveQuery => {
      this.ticketLiveQuery = liveQuery
      return this.ticketLiveQuery.on('update', ticket => {
        if (ticket.updatedAt.getTime() != this.state.ticket.updatedAt.getTime()) {
          return Promise.all([
            ticket.fetch({include: 'author,organization,assignee,files'}),
            AV.Cloud.run('getPrivateTags', {ticketId: ticket.id}),
          ])
          .then(([ticket, privateTags]) => {
            if (privateTags) {
              ticket.set('privateTags', privateTags.privateTags)
            }
            this.setState({ticket})
            return
          })
          .catch(this.context.addNotification)
        }
      })
    })
    .catch(this.context.addNotification)
    return query
  }

  getReplyQuery(ticket) {
    const replyQuery = new AV.Query('Reply')
    .equalTo('ticket', ticket)
    .include('author')
    .include('files')
    .limit(500)
    replyQuery.subscribe().then(liveQuery => {
      this.replyLiveQuery = liveQuery
      return this.replyLiveQuery.on('create', reply => {
        return reply.fetch({include: 'author,files'})
        .then(() => {
          const replies = this.state.replies
          replies.push(reply)
          this.setState({replies})
          return
        }).catch(this.context.addNotification)
      })
    })
    .catch(this.context.addNotification)
    return replyQuery
  }

  getOpsLogQuery(ticket) {
    const opsLogQuery = new AV.Query('OpsLog')
    .equalTo('ticket', ticket)
    .ascending('createdAt')
    opsLogQuery.subscribe()
    .then(liveQuery => {
      this.opsLogLiveQuery = liveQuery
      return this.opsLogLiveQuery.on('create', opsLog => {
        return opsLog.fetch()
        .then(() => {
          const opsLogs = this.state.opsLogs
          opsLogs.push(opsLog)
          this.setState({opsLogs})
          return
        }).catch(this.context.addNotification)
      })
    })
    .catch(this.context.addNotification)
    return opsLogQuery
  }

  commitReply(reply, files) {
    return uploadFiles(files)
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
    const ticket = this.state.ticket
    return AV.Cloud.run('operateTicket', {ticketId: ticket.id, action})
    .then(() => {
      return ticket.fetch({include: 'author,organization,assignee,files'})
    })
    .then(() => {
      this.setState({ticket})
      return
    })
    .catch(this.context.addNotification)
  }

  updateTicketCategory(category) {
    return this.state.ticket.set('category', getTinyCategoryInfo(category)).save()
    .then((ticket) => {
      this.setState({ticket})
      return
    })
  }

  updateTicketAssignee(assignee) {
    return this.state.ticket.set('assignee', assignee).save()
    .then((ticket) => {
      this.setState({ticket})
      return
    })
  }

  saveTag(key, value, isPrivate) {
    const ticket = this.state.ticket
    let tags = ticket.get(isPrivate ? 'privateTags' : 'tags')
    if (!tags) {
      tags = []
    }
    const tag = _.find(tags, {key})
    if (!tag) {
      if (value == '') {
        return
      }
      tags.push({key, value})
    } else {
      if (value == '') {
        tags = _.reject(tags, {key})
      } else {
        tag.value = value
      }
    }
    ticket.set(isPrivate ? 'privateTags' : 'tags', tags)
    return ticket.save()
    .then(() => {
      this.setState({ticket})
      return
    })
  }

  saveEvaluation(evaluation) {
    return this.state.ticket.set('evaluation', evaluation).save()
    .then((ticket) => {
      this.setState({ticket})
      return
    })
  }

  contentView(content) {
    return (
      <div dangerouslySetInnerHTML={{__html: myxss.process(content)}} />
    )
  }

  getTime(avObj) {
    if (new Date() - avObj.get('createdAt') > 86400000) {
      return <a href={'#' + avObj.id} className="timestamp" title={moment(avObj.get('createdAt')).format()}>{moment(avObj.get('createdAt')).calendar()}</a>
    } else {
      return <a href={'#' + avObj.id} className="timestamp" title={moment(avObj.get('createdAt')).format()}>{moment(avObj.get('createdAt')).fromNow()}</a>
    }
  }

  ticketTimeline(avObj) {
    if (avObj.className === 'OpsLog') {
      switch (avObj.get('action')) {
      case 'selectAssignee':
        return (
          <div className='ticket-status' id={avObj.id} key={avObj.id}>
            <div className='ticket-status-left'>
              <span className='icon-wrap'><span className='glyphicon glyphicon-transfer'></span></span>
            </div>
            <div className='ticket-status-right'>
              系统于 {this.getTime(avObj)} 将工单分配给 <UserLabel user={avObj.get('data').assignee} /> 处理
            </div>
          </div>
        )
      case 'changeCategory':
        return (
          <div className='ticket-status' id={avObj.id} key={avObj.id}>
            <div className='ticket-status-left'>
              <span className='icon-wrap'><span className='glyphicon glyphicon-transfer'></span></span>
            </div>
            <div className='ticket-status-right'>
              <UserLabel user={avObj.get('data').operator} /> 于 {this.getTime(avObj)} 将工单类别改为 <span className={csCss.category + ' ' + css.category}>{getCategoryPathName(avObj.get('data').category, this.state.categoriesTree)}</span>
            </div>
          </div>
        )
      case 'changeAssignee':
        return (
          <div className='ticket-status' id={avObj.id} key={avObj.id}>
            <div className='ticket-status-left'>
              <span className='icon-wrap'><span className='glyphicon glyphicon-transfer'></span></span>
            </div>
            <div className='ticket-status-right'>
              <UserLabel user={avObj.get('data').operator} /> 于 {this.getTime(avObj)} 将工单负责人改为 <UserLabel user={avObj.get('data').assignee} />
            </div>
          </div>
        )
      case 'replyWithNoContent':
        return (
          <div className='ticket-status' id={avObj.id} key={avObj.id}>
            <div className='ticket-status-left'>
              <span className='icon-wrap'><span className='glyphicon glyphicon-comment'></span></span>
            </div>
            <div className='ticket-status-right'>
              <UserLabel user={avObj.get('data').operator} /> 于 {this.getTime(avObj)} 认为该工单暂时无需回复，如有问题可以回复该工单
            </div>
          </div>
        )
      case 'replySoon':
        return (
          <div className='ticket-status' id={avObj.id} key={avObj.id}>
            <div className='ticket-status-left'>
              <span className='icon-wrap awaiting'><span className='glyphicon glyphicon-hourglass'></span></span>
            </div>
            <div className='ticket-status-right'>
              <UserLabel user={avObj.get('data').operator} /> 于 {this.getTime(avObj)} 认为该工单处理需要一些时间，稍后会回复该工单
            </div>
          </div>
        )
      case 'resolve':
        return (
          <div className='ticket-status' id={avObj.id} key={avObj.id}>
            <div className='ticket-status-left'>
              <span className='icon-wrap resolved'><span className='glyphicon glyphicon-ok-circle'></span></span>
            </div>
            <div className='ticket-status-right'>
              <UserLabel user={avObj.get('data').operator} /> 于 {this.getTime(avObj)} 认为该工单已经解决
            </div>
          </div>
        )
      case 'reject':
        return (
          <div className='ticket-status' id={avObj.id} key={avObj.id}>
            <div className='ticket-status-left'>
              <span className='icon-wrap closed'><span className='glyphicon glyphicon-ban-circle'></span></span>
            </div>
            <div className='ticket-status-right'>
              <UserLabel user={avObj.get('data').operator} /> 于 {this.getTime(avObj)} 关闭了该工单
            </div>
          </div>
        )
      case 'reopen':
        return (
          <div className='ticket-status' id={avObj.id} key={avObj.id}>
            <div className='ticket-status-left'>
              <span className='icon-wrap reopened'><span className='glyphicon glyphicon-record'></span></span>
            </div>
            <div className='ticket-status-right'>
              <UserLabel user={avObj.get('data').operator} /> 于 {this.getTime(avObj)} 重新打开该工单
            </div>
          </div>
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
            return <a href={f.url()} target='_blank'><img key={f.id} src={f.url()} alt={f.get('name')} /></a>
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
          {userLabel} 提交于 {this.getTime(avObj)}
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
    const ticket = this.state.ticket
    if (ticket === null) {
      return (
      <div>读取中……</div>
      )
    }

    // 如果是客服自己提交工单，则当前客服在该工单中认为是用户，
    // 这时为了方便工单作为内部工作协调使用。
    const isCustomerService = this.props.isCustomerService && ticket.get('author').id != this.props.currentUser.id
    const timeline = _.chain(this.state.replies)
      .concat(this.state.opsLogs)
      .sortBy((data) => {
        return data.get('createdAt')
      }).map(this.ticketTimeline.bind(this))
      .value()
    let optionButtons = <div></div>
    const ticketStatus = ticket.get('status')
    if (isTicketOpen(ticket)) {
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
    } else if (ticketStatus === TICKET_STATUS.PRE_FULFILLED && !isCustomerService) {
      optionButtons = (
        <Alert bsStyle="warning">
          <ControlLabel>我们认为该工单已解决，请确认：</ControlLabel>
          <Button bsStyle="primary" onClick={() => this.operateTicket('resolve')}>确认已解决</Button>
          {' '}
          <Button onClick={() => this.operateTicket('reopen')}>未解决</Button>
        </Alert>
      )
    } else if (isCustomerService) {
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
            <DocumentTitle title={ticket.get('title') + ' - LeanTicket' || 'LeanTicket'} />
            <h1>{ticket.get('title')}</h1>
            <div className={css.meta}>
              <span className={csCss.nid}>#{ticket.get('nid')}</span>
              <TicketStatusLabel status={ticket.get('status')} />
              {' '}
              <span>
                <UserLabel user={ticket.get('author')} /> 创建于 <span title={moment(ticket.get('createdAt')).format()}>{moment(ticket.get('createdAt')).fromNow()}</span>
                {moment(ticket.get('createdAt')).fromNow() === moment(ticket.get('updatedAt')).fromNow() ||
                  <span>，更新于 <span title={moment(ticket.get('updatedAt')).format()}>{moment(ticket.get('updatedAt')).fromNow()}</span></span>
                }
              </span>
            </div>
            <hr />
          </div>
        </div>

        <div className="row">
          <div className="col-sm-8">
            <div className="tickets">
              {this.ticketTimeline(ticket)}
              <div>{timeline}</div>
            </div>

            {isTicketOpen(ticket) &&
              <div>
                <hr />

                <TicketReply
                  ticket={ticket}
                  commitReply={this.commitReply.bind(this)}
                  commitReplySoon={this.commitReplySoon.bind(this)}
                  operateTicket={this.operateTicket.bind(this)}
                  isCustomerService={isCustomerService}
                />
              </div>
            }
            {!isTicketOpen(ticket) &&
              <div>
                <hr />

                <Evaluation
                  saveEvaluation={this.saveEvaluation.bind(this)}
                  ticket={ticket}
                  isCustomerService={isCustomerService}
                />
              </div>
            }
          </div>

          <div className={'col-sm-4 ' + css.sidebar}>
            <TicketMetadata ticket={ticket}
              isCustomerService={isCustomerService}
              categoriesTree={this.state.categoriesTree}
              updateTicketAssignee={this.updateTicketAssignee.bind(this)}
              updateTicketCategory={this.updateTicketCategory.bind(this)}
              saveTag={this.saveTag.bind(this)}
            />

            {optionButtons}
          </div>
        </div>
      </div>
    )
  }

}

Ticket.propTypes = {
  router: PropTypes.object,
  currentUser: PropTypes.object,
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

  componentDidMount() {
    this.contentTextarea.addEventListener('paste', this.pasteEventListener.bind(this))
  }

  componentWillUnmount() {
    this.contentTextarea.removeEventListener('paste', this.pasteEventListener.bind(this))
  }

  handleReplyOnChange(e) {
    localStorage.setItem(`ticket:${this.props.ticket.id}:reply`, e.target.value)
    this.setState({reply: e.target.value})
  }

  handleReplyOnKeyDown(e) {
    if(e.keyCode == 13 && e.metaKey) {
      this.handleReplyCommit(e)
    }
  }

  handleReplyCommit(e) {
    e.preventDefault()
    this.setState({isCommitting: true})
    return this.props.commitReply(this.state.reply, this.fileInput.files)
    .then(() => {
      localStorage.removeItem(`ticket:${this.props.ticket.id}:reply`)
      this.setState({reply: ''})
      this.fileInput.value = ''
      return
    })
    .catch(this.context.addNotification)
    .then(() => {
      this.setState({isCommitting: false})
      return
    })
  }

  handleReplySoon(e) {
    e.preventDefault()
    this.setState({isCommitting: true})
    return this.props.commitReplySoon(this.state.reply, this.fileInput.files)
    .then(() => {
      localStorage.removeItem(`ticket:${this.props.ticket.id}:reply`)
      this.setState({reply: ''})
      this.fileInput.value = ''
      return
    })
    .catch(this.context.addNotification)
    .then(() => {
      this.setState({isCommitting: false})
      return
    })
  }

  handleReplyNoContent(e) {
    e.preventDefault()
    this.setState({isCommitting: true})
    return this.props.operateTicket('replyWithNoContent')
    .catch(this.context.addNotification)
    .then(() => {
      this.setState({isCommitting: false})
      return
    })
  }

  pasteEventListener(e) {
    if (e.clipboardData.types.indexOf('Files') != -1) {
      this.setState({isCommitting: true})
      return uploadFiles(e.clipboardData.files)
      .then((files) => {
        const reply = `${this.state.reply}\n<img src='${files[0].url()}' />`
        this.setState({isCommitting: false, reply})
        return
      })
    }
  }

  render() {
    let buttons
    const tooltip = (
      <Tooltip id="tooltip">Markdown 语法</Tooltip>
    )
    if (this.props.isCustomerService) {
      buttons = (
        <ButtonToolbar>
        <Button onClick={this.handleReplyNoContent.bind(this)} disabled={this.state.isCommitting}>无需回复</Button>
          <Button onClick={this.handleReplySoon.bind(this)} disabled={this.state.isCommitting}>稍后回复</Button>
          <Button onClick={this.handleReplyCommit.bind(this)} disabled={this.state.isCommitting} bsStyle="success" className={css.submit}>提交回复</Button>
        </ButtonToolbar>
      )
    } else {
      buttons = (
        <ButtonToolbar>
          <Button onClick={this.handleReplyCommit.bind(this)} bsStyle="success" className={css.submit}>提交回复</Button>
        </ButtonToolbar>
      )
    }
    return (
      <div>
        <form className="form-group">
          <FormGroup>
            <TextareaWithPreview componentClass="textarea" placeholder="在这里输入，粘贴图片即可上传。" rows="8"
              value={this.state.reply}
              onChange={this.handleReplyOnChange.bind(this)}
              onKeyDown={this.handleReplyOnKeyDown.bind(this)}
              inputRef={(ref) => this.contentTextarea = ref }
            />
          </FormGroup>

          <FormGroup>
            <FormControl type="file" multiple inputRef={ref => this.fileInput = ref} />
            <p className="help-block">上传附件可以多选</p>
          </FormGroup>

          <div className={css.form}>
            <div className={css.formLeft}>
              <p className={css.markdownTip}>
                <OverlayTrigger placement="top" overlay={tooltip}>
                  <b className="has-required" title="支持 Markdown 语法">M↓</b>
                </OverlayTrigger> <a href="https://forum.leancloud.cn/t/topic/15412" target="_blank" rel="noopener">支持 Markdown 语法</a>
              </p>
            </div>
            <div className={css.formRight}>
              {buttons}
            </div>
          </div>
        </form>
      </div>
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

class TicketMetadata extends Component {

  constructor(props) {
    super(props)
    this.state = {
      isUpdateAssignee: false,
      isUpdateCategory: false,
      assignees: [],
    }
  }

  componentDidMount() {
    this.fetchDatas()
  }

  fetchDatas() {
    getCustomerServices()
    .then(assignees => {
      this.setState({assignees})
      return
    })
    .catch(this.context.addNotification)
  }

  handleAssigneeChange(e) {
    const customerService = _.find(this.state.assignees, {id: e.target.value})
    this.props.updateTicketAssignee(customerService)
    .then(() => {
      this.setState({isUpdateAssignee: false})
      return
    })
    .then(this.context.addNotification)
    .catch(this.context.addNotification)
  }

  handleCategoryChange(e) {
    this.props.updateTicketCategory(depthFirstSearchFind(this.props.categoriesTree, c => c.id == e.target.value))
    .then(() => {
      this.setState({isUpdateCategory: false})
      return
    })
    .then(this.context.addNotification)
    .catch(this.context.addNotification)
  }

  handleTagChange(key, value, isPrivate) {
    return this.props.saveTag(key, value, isPrivate)
  }

  render() {
    const {ticket, isCustomerService} = this.props
    return <div>
      <FormGroup>
        <label className="label-block">负责人</label>
        {this.state.isUpdateAssignee ?
          <FormControl componentClass='select' value={ticket.get('assignee').id} onChange={this.handleAssigneeChange.bind(this)}>
            {this.state.assignees.map((cs) => <option key={cs.id} value={cs.id}>{cs.get('username')}</option>)}
          </FormControl>
          :
          <span className={css.assignee}>
            <UserLabel user={ticket.get('assignee')} />
            {isCustomerService && 
              <Button bsStyle='link' onClick={() => this.setState({isUpdateAssignee: true})}>
                <span className='glyphicon glyphicon-pencil' aria-hidden="true"></span>
              </Button>
            }
          </span>
        }
      </FormGroup>
      <FormGroup>
        <label className="label-block">类别</label>
        {this.state.isUpdateCategory ?
          <CategoriesSelect categoriesTree={this.props.categoriesTree}
            selected={ticket.get('category')}
            onChange={this.handleCategoryChange.bind(this)} />
          :
          <div>
            <span className={csCss.category + ' ' + css.categoryBlock}>
              {getCategoryPathName(ticket.get('category'), this.props.categoriesTree)}
            </span>
            {isCustomerService &&
              <Button bsStyle='link' onClick={() => this.setState({isUpdateCategory: true})}>
                <span className='glyphicon glyphicon-pencil' aria-hidden="true"></span>
              </Button>
            }
          </div>
        }
      </FormGroup>

      {this.context.tagMetadatas.map(tagMetadata => {
        const tags = ticket.get(tagMetadata.get('isPrivate') ? 'privateTags' : 'tags')
        const tag = _.find(tags, t => t.key == tagMetadata.get('key'))
        return <TagForm key={tagMetadata.id}
                        tagMetadata={tagMetadata}
                        tag={tag}
                        changeTagValue={this.handleTagChange.bind(this)}
                        isCustomerService={isCustomerService} />
      })}
    </div>
  }
}

TicketMetadata.propTypes = {
  isCustomerService: PropTypes.bool.isRequired,
  ticket: PropTypes.instanceOf(AV.Object),
  categoriesTree: PropTypes.array.isRequired,
  updateTicketAssignee: PropTypes.func.isRequired,
  updateTicketCategory: PropTypes.func.isRequired,
  saveTag: PropTypes.func.isRequired,
}

TicketMetadata.contextTypes = {
  tagMetadatas: PropTypes.array,
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
      return
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
