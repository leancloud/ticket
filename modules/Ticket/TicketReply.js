import React, { Component, useEffect, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'

import TextareaWithPreview from '../components/TextareaWithPreview'
import css from './index.css'
import { useMutation, useQueryClient } from 'react-query'
import { commitTicketReply } from './hooks'
import { uploadFiles } from '../common'

class TicketReply_ extends Component {
  constructor(props) {
    super(props)
    this.state = {
      reply: localStorage.getItem(`ticket:${this.props.ticket.objectId}:reply`) || '',
      files: [],
      isCommitting: false,
    }
    this.fileInput = React.createRef()
  }

  handleReplyOnChange(value) {
    localStorage.setItem(`ticket:${this.props.ticket.objectId}:reply`, value)
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
        localStorage.removeItem(`ticket:${this.props.ticket.objectId}:reply`)
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

export default function TicketReply({ ticket, isCustomerService }) {
  const { t } = useTranslation()
  const [content, setContent] = useState(
    localStorage.getItem(`ticket:${ticket.objectId}:reply`) || ''
  )
  const $fileInput = useRef()
  const [committing, setCommitting] = useState(false)
  useEffect(() => {
    localStorage.setItem(`ticket:${ticket.objectId}:reply`, content)
  }, [content])

  const queryClient = useQueryClient()
  const { mutate: commitReply } = useMutation(
    ({ content, files }) => commitTicketReply(ticket.nid, content, files),
    {
      onMutate: () => setCommitting(true),
      onSuccess: () => {
        console.log('reply!!!')
      },
      onSettled: () => setCommitting(false),
    }
  )

  const handleCommit = async () => {
    const trimedContent = content.trim()
    const files = $fileInput.current.files
    if (!trimedContent && files.length === 0) {
      return
    }
    commitReply({
      content: trimedContent,
      files: await uploadFiles(files),
    })
  }

  const handleKeyDown = (e) => {
    if (e.keyCode == 13 && e.metaKey) {
      handleCommit(e)
    }
  }

  return (
    <Form>
      <Form.Group>
        <TextareaWithPreview
          rows="8"
          value={content}
          onChange={setContent}
          onKeyDown={handleKeyDown}
        />
      </Form.Group>

      <Form.Group>
        <Form.Control type="file" multiple ref={$fileInput} />
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
              <Button variant="light" onClick={() => {}} disabled={committing}>
                {t('noNeedToReply')}
              </Button>{' '}
              <Button variant="light" onClick={() => {}} disabled={committing}>
                {t('replyLater')}
              </Button>{' '}
            </>
          )}
          <Button
            className={css.submit}
            variant="success"
            onClick={handleCommit}
            disabled={committing}
          >
            {t('submit')}
          </Button>
        </div>
      </Form.Group>
    </Form>
  )
}

TicketReply.propTypes = {
  ticket: PropTypes.shape({
    objectId: PropTypes.string.isRequired,
  }).isRequired,
  isCustomerService: PropTypes.bool,
  t: PropTypes.func.isRequired,
}
