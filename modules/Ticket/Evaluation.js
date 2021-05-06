import React, { useContext, useEffect, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'

import { AppContext } from '../context'
import { fetch } from '../../lib/leancloud'

export default function Evaluation({ ticket, isCustomerService }) {
  const { t } = useTranslation()
  const { addNotification } = useContext(AppContext)
  const [star, setStar] = useState(ticket.evaluation?.star ?? 1)
  const [content, setContent] = useState(ticket.evaluation?.content ?? '')
  useEffect(() => {
    localStorage.setItem(`ticket:${ticket.nid}:evaluation`, content)
  }, [ticket.nid, content])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await fetch(`/api/1/tickets/${ticket.nid}/evaluation`, {
        method: 'PUT',
        body: { star, content },
      })
      localStorage.removeItem(`ticket:${ticket.nid}:evaluation`)
    } catch (error) {
      addNotification(error)
    }
  }

  if (!ticket.evaluation && isCustomerService) {
    return null
  }
  return (
    <Alert variant="warning">
      {ticket.evaluation ? t('feedback') : t('satisfiedOrNot')}
      <Form onSubmit={handleSubmit}>
        <Form.Group>
          <Form.Check
            id="evaluation-good"
            label={<Icon.HandThumbsUp />}
            type="radio"
            inline
            disabled={!!ticket.evaluation}
            checked={star === 1}
            value={1}
            onChange={() => setStar(1)}
          />
          <Form.Check
            id="evaluation-bad"
            label={<Icon.HandThumbsDown />}
            type="radio"
            inline
            disabled={!!ticket.evaluation}
            checked={star === 0}
            value={0}
            onChange={() => setStar(0)}
          />
        </Form.Group>
        <Form.Group>
          <Form.Control
            as="textarea"
            rows={8}
            placeholder={ticket.evaluation ? '' : t('haveSomethingToSay')}
            value={content}
            disabled={!!ticket.evaluation}
            onChange={(e) => setContent(e.target.value)}
          />
        </Form.Group>
        {!ticket.evaluation && (
          <Button type="submit" variant="light">
            {t('submit')}
          </Button>
        )}
      </Form>
    </Alert>
  )
}

Evaluation.propTypes = {
  ticket: PropTypes.shape({
    objectId: PropTypes.string.isRequired,
    evaluation: PropTypes.shape({
      star: PropTypes.number.isRequired,
      content: PropTypes.string.isRequired,
    }),
  }).isRequired,
  isCustomerService: PropTypes.bool,
}
