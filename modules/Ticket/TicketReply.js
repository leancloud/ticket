import React, { Component } from 'react'
import { Button, Form } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'
import LC from '../../lib/leancloud'

import TextareaWithPreview from '../components/TextareaWithPreview'
import css from './index.css'

class TicketReply extends Component {
  constructor(props) {
    super(props)
    this.state = {
      reply: localStorage.getItem(`ticket:${this.props.ticket.id}:reply`) || '',
      files: [],
      isCommitting: false,
    }
    this.fileInput = React.createRef()
  }

  handleReplyOnChange(value) {
    localStorage.setItem(`ticket:${this.props.ticket.id}:reply`, value)
    this.setState({ reply: value })
  }

  handleReplyOnKeyDown(e) {
    if (e.keyCode == 13 && e.metaKey) {
      this.handleReplyCommit(e)
    }
  }

  handleReplyCommit(e) {
    e.preventDefault()
    this.setState({ isCommitting: true })
    return this.props
      .commitReply(this.state.reply, this.fileInput.files)
      .then(() => {
        localStorage.removeItem(`ticket:${this.props.ticket.id}:reply`)
        this.setState({ reply: '' })
        this.fileInput.value = ''
        return
      })
      .catch(this.context.addNotification)
      .finally(() => this.setState({ isCommitting: false }))
  }

  handleReplySoon(e) {
    e.preventDefault()
    this.setState({ isCommitting: true })
    return this.props
      .commitReplySoon()
      .catch(this.context.addNotification)
      .finally(() => this.setState({ isCommitting: false }))
  }

  handleReplyNoContent(e) {
    e.preventDefault()
    this.setState({ isCommitting: true })
    return this.props
      .operateTicket('replyWithNoContent')
      .catch(this.context.addNotification)
      .finally(() => this.setState({ isCommitting: false }))
  }

  render() {
    const { t, isCustomerService } = this.props
    return (
      <Form>
        <Form.Group>
          <TextareaWithPreview
            rows="8"
            value={this.state.reply}
            onChange={this.handleReplyOnChange.bind(this)}
            onKeyDown={this.handleReplyOnKeyDown.bind(this)}
          />
        </Form.Group>

        <Form.Group>
          <Form.Control type="file" multiple ref={(ref) => (this.fileInput = ref)} />
          <Form.Text muted>{t('multipleAttachments')}</Form.Text>
        </Form.Group>

        <Form.Group className="d-block d-md-flex">
          <div className="flex-fill">
            <p className={css.markdownTip}>
              <Icon.Markdown />{' '}
              <a href="https://forum.leancloud.cn/t/topic/15412" target="_blank" rel="noopener">
                {t('supportMarkdown')}
              </a>
            </p>
          </div>
          <div>
            {isCustomerService && (
              <>
                <Button
                  variant="light"
                  onClick={this.handleReplyNoContent.bind(this)}
                  disabled={this.state.isCommitting}
                >
                  {t('noNeedToReply')}
                </Button>{' '}
                <Button
                  variant="light"
                  onClick={this.handleReplySoon.bind(this)}
                  disabled={this.state.isCommitting}
                >
                  {t('replyLater')}
                </Button>{' '}
              </>
            )}
            <Button
              className={css.submit}
              variant="success"
              onClick={this.handleReplyCommit.bind(this)}
              disabled={this.state.isCommitting}
            >
              {t('submit')}
            </Button>
          </div>
        </Form.Group>
      </Form>
    )
  }
}

TicketReply.propTypes = {
  ticket: PropTypes.instanceOf(LC.LCObject),
  commitReply: PropTypes.func.isRequired,
  commitReplySoon: PropTypes.func.isRequired,
  operateTicket: PropTypes.func.isRequired,
  isCustomerService: PropTypes.bool,
  t: PropTypes.func.isRequired,
}

TicketReply.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default withTranslation()(TicketReply)
