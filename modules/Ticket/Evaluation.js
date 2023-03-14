import React, { useCallback, useContext, useState } from 'react'
import { Alert, Badge, Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from 'react-query'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'

import { AppContext } from '../context'
import { auth, fetch } from '../../lib/leancloud'

export function Evaluation({ ticket }) {
  const { t } = useTranslation()
  const { addNotification } = useContext(AppContext)
  const storageKey = `ticket:${ticket.id}:evaluation`
  const [star, setStar] = useState(ticket.evaluation?.star ?? 1)
  const [content, setContent] = useState(
    ticket.evaluation?.content ?? localStorage.getItem(storageKey) ?? ''
  )
  const [editing, setEditing] = useState(!ticket.evaluation)

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
      fetch(`/api/2/tickets/${ticket.id}`, {
        method: 'PATCH',
        body: { evaluation },
      }),
    onSuccess: (evaluation) => {
      queryClient.setQueryData(['ticket', ticket.id], (current) => ({
        ...current,
        evaluation,
      }))
      localStorage.removeItem(storageKey)
      setEditing(false)
    },
    onError: (error) => addNotification(error),
  })

  const commitable = auth.currentUser?.id === ticket.authorId
  const readonly = !editing || isLoading

  if (!ticket.evaluation && !commitable) {
    return null
  }
  return (
    <Alert variant={ticket.evaluation ? (ticket.evaluation.star ? 'success' : 'danger') : 'info'}>
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
        {!editing && commitable && window.ALLOW_MUTATE_EVALUATION && (
          <Button variant="link" onClick={() => setEditing(true)}>
            {t('edit')}
          </Button>
        )}
      </Form.Group>
      {!editing && ticket.evaluation?.selections?.length > 0 && (
        <>
          <div className="mb-1" style={{ fontSize: '1rem' }}>
            {t('evaluation.selections')}
          </div>
          <div className="d-flex flex-wrap mb-4" style={{ fontSize: '1.25rem' }}>
            {ticket.evaluation.selections.map((selection) => (
              <Badge variant="info" className="mr-1" key={selection}>
                {selection}
              </Badge>
            ))}
          </div>
        </>
      )}
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
      {editing && (
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
    authorId: PropTypes.string,
  }).isRequired,
}
