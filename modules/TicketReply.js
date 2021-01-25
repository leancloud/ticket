import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {FormGroup, FormControl, Button, ButtonToolbar} from 'react-bootstrap'
import LC from '../lib/leancloud'

import {uploadFiles} from './common'
import TextareaWithPreview from './components/TextareaWithPreview'
import translate from './i18n/translate'
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
  
  render() {
    const {t} = this.props
    let buttons
    if (this.props.isCustomerService) {
      buttons = (
          <ButtonToolbar>
          <Button onClick={this.handleReplyNoContent.bind(this)} disabled={this.state.isCommitting}>{t('noNeedToReply')}</Button>
            <Button onClick={this.handleReplySoon.bind(this)} disabled={this.state.isCommitting}>{t('replyLater')}</Button>
            <Button onClick={this.handleReplyCommit.bind(this)} disabled={this.state.isCommitting} bsStyle="success" className={css.submit}>{t('submit')}</Button>
          </ButtonToolbar>
        )
    } else {
      buttons = (
          <ButtonToolbar>
            <Button onClick={this.handleReplyCommit.bind(this)} bsStyle="success" className={css.submit}>{t('submit')}</Button>
          </ButtonToolbar>
        )
    }
    return (
        <div>
          <form className="form-group">
            <FormGroup>
              <TextareaWithPreview componentClass="textarea" rows="8"
                value={this.state.reply}
                onChange={this.handleReplyOnChange.bind(this)}
                onKeyDown={this.handleReplyOnKeyDown.bind(this)}
              />
            </FormGroup>
  
            <FormGroup>
              <FormControl type="file" multiple inputRef={ref => this.fileInput = ref} />
              <p className="help-block">{t('multipleAttachments')}</p>
            </FormGroup>
  
            <div className={css.form}>
              <div className={css.formLeft}>
                <p className={css.markdownTip}> 
                  <b className="has-required">M↓</b>{' '}
                  <a href="https://forum.leancloud.cn/t/topic/15412" target="_blank" rel="noopener">{t('supportMarkdown')}</a>
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
  ticket: PropTypes.instanceOf(LC.LCObject),
  commitReply: PropTypes.func.isRequired,
  commitReplySoon: PropTypes.func.isRequired,
  operateTicket: PropTypes.func.isRequired,
  isCustomerService: PropTypes.bool,
  t: PropTypes.func
}
  
TicketReply.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}
  
  
export default translate(TicketReply) 