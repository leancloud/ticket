import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {FormGroup, FormControl, Button, ButtonToolbar, Tooltip, OverlayTrigger} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

import {uploadFiles} from './common'
import TextareaWithPreview from './components/TextareaWithPreview'
import css from './Ticket.css'


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
    return this.props.commitReplySoon()
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
  
  
export default TicketReply  