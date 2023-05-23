import { useQuery } from 'react-query'
import React, { useCallback } from 'react'
import { fetch } from '../../lib/leancloud'
import PropTypes from 'prop-types'
import { Button, Form } from 'react-bootstrap'
import { useHistory } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 *
 * @param {string} id
 * @param {string} [viewId="incoming"]
 * @returns {import('react-query').UseQueryResult<{ id?: string }, Error>}
 */
const useNextTicketId = (id, viewId = 'incoming') =>
  useQuery({
    queryFn: () =>
      fetch(`/api/2/views/${viewId}/next`, {
        query: {
          ticketId: id,
        },
      }),
    queryKey: ['view', 'next', viewId, id],
  })

export const NextTicketButton = ({ id, viewId }) => {
  const { data, isLoading } = useNextTicketId(id, viewId)

  const history = useHistory()
  const { t } = useTranslation()

  const handleNextTicket = useCallback(() => {
    history.push(`/tickets/${data?.nid}${viewId ? `?view=${viewId}` : ''}`)
  }, [data, history, viewId])

  return (
    <Button variant="light" disabled={isLoading || !data?.nid} onClick={handleNextTicket}>
      {data?.nid ? t('nextProcessableTicket') : t('noProcessableTicket')}
    </Button>
  )
}

NextTicketButton.propTypes = {
  id: PropTypes.string,
  viewId: PropTypes.string,
}

export const NextTicketSection = ({ id, viewId }) => {
  const { t } = useTranslation()

  return (
    <Form.Group>
      <Form.Label>{t('otherOperations')}</Form.Label>
      <div>
        <NextTicketButton id={id} viewId={viewId} />
      </div>
    </Form.Group>
  )
}

NextTicketSection.propTypes = {
  id: PropTypes.string,
  viewId: PropTypes.string,
}
