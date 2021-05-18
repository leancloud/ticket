import React, { useCallback, useContext, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'

import { AppContext } from '../context'
import { fetch } from '../../lib/leancloud'
import { useMutation, useQueryClient } from 'react-query'
import { useToggle } from 'react-use'

export function Evaluation({ ticket, isCustomerService }) {
  const { t } = useTranslation()
  const { addNotification } = useContext(AppContext)
  const storageKey = `ticket:${ticket.id}:evaluation`
  const [star, setStar] = useState(ticket.evaluation?.star ?? 1)
  const [content, setContent] = useState(ticket.evaluation?.content ?? localStorage.getItem(storageKey) ?? '')
  const [editing, toggleEditing] = useToggle(ticket.evaluation === undefined)
  const readonly = (ticket.evaluation || isLoading) && !editing

  const setEvaluationContent = useCallback(
    (content) => {
      setContent(content)
      if (content) {
        localStorage.setItem(storageKey, content)
      } else {
        localStorage.removeItem(storageKey)
      }
    },
    [storageKey]
  )

  const queryClient = useQueryClient()
  const { mutate, isLoading } = useMutation({
    mutationFn: (evaluation) =>
      fetch(`/api/1/tickets/${ticket.id}`, {
        method: 'PATCH',
        body: { evaluation },
      }),
    onSuccess: (evaluation) => {
      queryClient.setQueryData(['ticket', ticket.id], (current) => ({
        ...current,
        evaluation,
      }))
      localStorage.removeItem(storageKey)
      toggleEditing(false)
    },
    onError: (error) => addNotification(error),
  })

  if (!ticket.evaluation && isCustomerService) {
    return null
  }
  return (
    <Alert variant="warning">
      {ticket.evaluation ? t('feedback') : t('satisfiedOrNot')}
      <Form.Group>
        <Form.Check
          id="evaluation-good"
          label={<Icon.HandThumbsUp />}
          type="radio"
          inline
          disabled={readonly}
          checked={star === 1}
          value={1}
          onChange={() => setStar(1)}
        />
        <Form.Check
          id="evaluation-bad"
          label={<Icon.HandThumbsDown />}
          type="radio"
          inline
          disabled={readonly}
          checked={star === 0}
          value={0}
          onChange={() => setStar(0)}
        />
        {ticket.evaluation && !editing && (
          <Button variant="link" onClick={toggleEditing}>
            {t('edit')}
          </Button>
        )}
      </Form.Group>
      <Form.Group>
        <Form.Control
          as="textarea"
          rows={8}
          placeholder={ticket.evaluation ? '' : t('haveSomethingToSay')}
          value={content}
          disabled={readonly}
          onChange={(e) => setEvaluationContent(e.target.value)}
        />
      </Form.Group>
      {!readonly && (
        <Button variant="light" disabled={isLoading} onClick={() => mutate({ star, content })}>
          {t('submit')}
        </Button>
      )}
    </Alert>
  )
}

Evaluation.propTypes = {
  ticket: PropTypes.shape({
    id: PropTypes.string.isRequired,
    evaluation: PropTypes.object,
  }).isRequired,
  isCustomerService: PropTypes.bool,
}
